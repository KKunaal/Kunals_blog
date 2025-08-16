package controllers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"kunals-blog-backend/database"
	"kunals-blog-backend/models"

	"github.com/gin-gonic/gin"
)

type CreateBlogRequest struct {
	Title      string     `json:"title" binding:"required"`
	Content    string     `json:"content" binding:"required"`
	Language   string     `json:"language"`
	Images     []string   `json:"images"`
	CustomDate *time.Time `json:"custom_date"`
}

type UpdateBlogRequest struct {
	Title      string     `json:"title"`
	Content    string     `json:"content"`
	Language   string     `json:"language"`
	Images     []string   `json:"images"`
	CustomDate *time.Time `json:"custom_date"`
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

	blog := models.Blog{
		Title:      req.Title,
		Content:    req.Content,
		Preview:    preview,
		Language:   req.Language,
		Images:     imagesJSON,
		CustomDate: req.CustomDate,
	}

	if req.Language == "" {
		blog.Language = "english"
	}

	if err := db.Create(&blog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create blog"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Blog created successfully",
		"blog":    blog,
	})
}

// GetBlogs returns paginated list of blogs
func GetBlogs(c *gin.Context) {
	db := database.GetDB()

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	publishedOnly := c.DefaultQuery("published_only", "true") == "true"
	language := c.Query("language")

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

	// Get blogs with pagination
	var blogs []models.Blog
	result := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&blogs)

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

// GetBlog returns a single blog by ID
func GetBlog(c *gin.Context) {
	blogID := c.Param("id")
	db := database.GetDB()

	var blog models.Blog
	result := db.Preload("Comments").Preload("Likes").First(&blog, "id = ?", blogID)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"blog": blog})
}

// UpdateBlog updates an existing blog
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

	// Update fields if provided
	if req.Title != "" {
		blog.Title = req.Title
	}
	if req.Content != "" {
		blog.Content = req.Content
		// Update preview
		preview := req.Content
		if len(preview) > 200 {
			preview = preview[:200] + "..."
		}
		blog.Preview = preview
	}
	if req.Language != "" {
		blog.Language = req.Language
	}
	if len(req.Images) > 0 {
		blog.Images = strings.Join(req.Images, ",")
	}
	if req.CustomDate != nil {
		blog.CustomDate = req.CustomDate
	}

	if err := db.Save(&blog).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update blog"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Blog updated successfully",
		"blog":    blog,
	})
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
