package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"kunals-blog-backend/database"
	"kunals-blog-backend/models"
	"kunals-blog-backend/utils"

	"github.com/gin-gonic/gin"
)

type CreateBlogRequest struct {
	Title      string   `json:"title" binding:"required"`
	Content    string   `json:"content" binding:"required"`
	Language   string   `json:"language"`
	Images     []string `json:"images"`
	CustomDate string   `json:"custom_date"`
}

type UpdateBlogRequest struct {
	Title      string   `json:"title"`
	Content    string   `json:"content"`
	Language   string   `json:"language"`
	Images     []string `json:"images"`
	CustomDate string   `json:"custom_date"`
}

// CreateBlog creates a new blog post (draft by default)
func CreateBlog(c *gin.Context) {
	var req CreateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// Generate preview from content (first 200 characters)
	preview := req.Content
	if len(preview) > 200 {
		preview = preview[:200] + "..."
	}

	// Convert images slice to JSON string
	imagesJSON := ""
	if len(req.Images) > 0 {
		imagesJSON = strings.Join(req.Images, ",")
	}

	var customDatePtr *time.Time
	if strings.TrimSpace(req.CustomDate) != "" {
		// Accept both YYYY-MM-DDTHH:mm and RFC3339
		if t, err := time.Parse("2006-01-02T15:04", req.CustomDate); err == nil {
			customDatePtr = &t
		} else if t2, err2 := time.Parse(time.RFC3339, req.CustomDate); err2 == nil {
			customDatePtr = &t2
		}
	}

	blog := models.Blog{
		Title:      req.Title,
		Content:    req.Content,
		Preview:    preview,
		Language:   req.Language,
		Images:     imagesJSON,
		CustomDate: customDatePtr,
	}
	if blog.Language == "" {
		blog.Language = "english"
	}
	if err := db.Create(&blog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create blog"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Blog created successfully", "blog": blog})
}

// GetBlogs returns paginated list of blogs
func GetBlogs(c *gin.Context) {
	db := database.GetDB()

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	publishedOnly := c.DefaultQuery("published_only", "true") == "true"
	language := c.Query("language")
	sortBy := c.DefaultQuery("sort_by", "recent") // recent | most_commented | most_liked | most_viewed

	offset := (page - 1) * limit

	// Build query
	query := db.Model(&models.Blog{})

	if publishedOnly {
		query = query.Where("is_published = ?", true)
	}

	if language != "" {
		query = query.Where("language = ?", language)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Sorting: prefer published_at when available
	switch sortBy {
	case "most_commented":
		query = query.Order("comments_count DESC").Order("COALESCE(published_at, created_at) DESC")
	case "most_liked":
		query = query.Order("likes_count DESC").Order("COALESCE(published_at, created_at) DESC")
	case "most_viewed":
		query = query.Order("views_count DESC").Order("COALESCE(published_at, created_at) DESC")
	default:
		query = query.Order("COALESCE(published_at, created_at) DESC")
	}

	// Get blogs with pagination
	var blogs []models.Blog
	result := query.Limit(limit).Offset(offset).Find(&blogs)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch blogs"})
		return
	}

	// Convert images string back to array for each blog
	for i := range blogs {
		if blogs[i].Images != "" {
			// For simplicity, we'll keep it as string in response
			// Frontend can split by comma if needed
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"blogs": blogs,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetBlog returns a single blog by ID and records a view
func GetBlog(c *gin.Context) {
	blogID := c.Param("id")
	db := database.GetDB()

	var blog models.Blog
	result := db.Preload("Comments").Preload("Likes").First(&blog, "id = ?", blogID)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	// Extract optional user from Authorization header (no middleware required)
	uid := ""
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := utils.ValidateJWT(token); err == nil {
			uid = claims.UserID
		}
	}

	ip := c.ClientIP()
	ua := c.GetHeader("User-Agent")

	var existing models.View
	viewQuery := db.Where("blog_id = ?", blogID)
	if uid != "" {
		viewQuery = viewQuery.Where("user_id = ?", uid)
	} else {
		viewQuery = viewQuery.Where("ip_address = ?", ip)
	}
	if err := viewQuery.First(&existing).Error; err != nil {
		view := models.View{BlogID: blogID, UserID: uid, IPAddress: ip, UserAgent: ua}
		if err := db.Create(&view).Error; err == nil {
			db.Model(&blog).Update("views_count", blog.ViewsCount+1)
		}
	}

	// load versions
	var versions []models.BlogVersion
	_ = db.Where("blog_id = ?", blogID).Order("created_at DESC").Find(&versions)

	c.JSON(http.StatusOK, gin.H{"blog": blog, "versions": versions})
}

// UpdateBlog updates and snapshots a version before saving
func UpdateBlog(c *gin.Context) {
	blogID := c.Param("id")
	var req UpdateBlogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db := database.GetDB()
	var blog models.Blog
	if err := db.First(&blog, "id = ?", blogID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}
	// Build a pending version from the requested changes or current values
	title := blog.Title
	content := blog.Content
	language := blog.Language
	images := blog.Images
	if req.Title != "" {
		title = req.Title
	}
	if req.Content != "" {
		content = req.Content
	}
	if req.Language != "" {
		language = req.Language
	}
	if len(req.Images) > 0 {
		images = strings.Join(req.Images, ",")
	}
	version := models.BlogVersion{BlogID: blog.ID, Title: title, Content: content, Language: language, Images: images, IsPending: true}
	if err := db.Create(&version).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create version"})
		return
	}
	// Update metadata on live blog (language/custom_date)
	metaUpdated := false
	if req.Language != "" && blog.Language != req.Language {
		blog.Language = req.Language
		metaUpdated = true
	}
	if strings.TrimSpace(req.CustomDate) != "" {
		if t, err := time.Parse("2006-01-02T15:04", req.CustomDate); err == nil {
			blog.CustomDate = &t
			metaUpdated = true
		} else if t2, err2 := time.Parse(time.RFC3339, req.CustomDate); err2 == nil {
			blog.CustomDate = &t2
			metaUpdated = true
		}
	}
	if metaUpdated {
		if blog.IsPublished && blog.CustomDate != nil {
			blog.PublishedAt = blog.CustomDate
		}
		if err := db.Save(&blog).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update blog metadata"})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"message": "Draft version created", "version": version, "blog": blog})
}

// PublishBlog publishes a draft blog
func PublishBlog(c *gin.Context) {
	blogID := c.Param("id")
	db := database.GetDB()

	var blog models.Blog
	if err := db.First(&blog, "id = ?", blogID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	blog.IsPublished = true
	if blog.CustomDate != nil {
		blog.PublishedAt = blog.CustomDate
	} else {
		now := time.Now()
		blog.PublishedAt = &now
	}

	if err := db.Save(&blog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish blog"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Blog published successfully",
		"blog":    blog,
	})
}

// UnpublishBlog unpublishes a blog (make it draft)
func UnpublishBlog(c *gin.Context) {
	blogID := c.Param("id")
	db := database.GetDB()

	var blog models.Blog
	if err := db.First(&blog, "id = ?", blogID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	blog.IsPublished = false
	blog.PublishedAt = nil

	if err := db.Save(&blog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unpublish blog"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Blog unpublished successfully",
		"blog":    blog,
	})
}

// ApplyVersion applies a pending version to the live blog without publishing
func ApplyVersion(c *gin.Context) {
	blogID := c.Param("id")
	versionID := c.Param("versionId")
	db := database.GetDB()

	var blog models.Blog
	if err := db.First(&blog, "id = ?", blogID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}
	var version models.BlogVersion
	if err := db.First(&version, "id = ? AND blog_id = ?", versionID, blogID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Version not found"})
		return
	}
	// snapshot current live into versions (history)
	_ = db.Create(&models.BlogVersion{BlogID: blog.ID, Title: blog.Title, Content: blog.Content, Language: blog.Language, Images: blog.Images, IsPending: false})
	// apply version fields to blog (live)
	blog.Title = version.Title
	blog.Content = version.Content
	blog.Language = version.Language
	blog.Images = version.Images
	// recalc preview
	preview := version.Content
	if len(preview) > 200 {
		preview = preview[:200] + "..."
	}
	blog.Preview = preview
	if err := db.Save(&blog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply version"})
		return
	}
	// mark version as not pending (applied)
	version.IsPending = false
	_ = db.Save(&version)
	c.JSON(http.StatusOK, gin.H{"message": "Version applied to draft", "blog": blog})
}

// DeleteBlog deletes a blog
func DeleteBlog(c *gin.Context) {
	blogID := c.Param("id")
	db := database.GetDB()

	// Delete associated comments and likes first
	db.Where("blog_id = ?", blogID).Delete(&models.Comment{})
	db.Where("blog_id = ?", blogID).Delete(&models.Like{})

	// Delete the blog
	result := db.Delete(&models.Blog{}, "id = ?", blogID)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete blog"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Blog deleted successfully"})
}
