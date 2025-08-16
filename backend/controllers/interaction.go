package controllers

import (
	"net/http"

	"kunals-blog-backend/database"
	"kunals-blog-backend/models"

	"github.com/gin-gonic/gin"
)

type CreateCommentRequest struct {
	BlogID      string `json:"blog_id" binding:"required"`
	AuthorName  string `json:"author_name"`
	Email       string `json:"email"`
	Content     string `json:"content" binding:"required"`
	IsAnonymous bool   `json:"is_anonymous"`
}

// CreateComment adds a new comment to a blog
func CreateComment(c *gin.Context) {
	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// Verify blog exists
	var blog models.Blog
	if err := db.First(&blog, "id = ? AND is_published = ?", req.BlogID, true).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	// Get client IP for tracking
	clientIP := c.ClientIP()

	comment := models.Comment{
		BlogID:      req.BlogID,
		AuthorName:  req.AuthorName,
		Email:       req.Email,
		Content:     req.Content,
		IsAnonymous: req.IsAnonymous,
		IPAddress:   clientIP,
	}

	if err := db.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create comment"})
		return
	}

	// Update comment count in blog
	db.Model(&blog).Update("comments_count", blog.CommentsCount+1)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Comment created successfully",
		"comment": comment,
	})
}

// GetComments returns all comments for a blog
func GetComments(c *gin.Context) {
	blogID := c.Param("id")
	db := database.GetDB()

	var comments []models.Comment
	result := db.Where("blog_id = ?", blogID).Order("created_at ASC").Find(&comments)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"comments": comments})
}

// LikeBlog adds a like to a blog (one per user if logged in, else per IP)
func LikeBlog(c *gin.Context) {
	blogID := c.Param("id")
	db := database.GetDB()

	// Verify blog exists and is published
	var blog models.Blog
	if err := db.First(&blog, "id = ? AND is_published = ?", blogID, true).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	clientIP := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	userIDVal, _ := c.Get("user_id")
	userID, _ := userIDVal.(string)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Login required to like"})
		return
	}

	// Check if already liked (by user if logged in, else by IP)
	var existingLike models.Like
	if err := db.Where("blog_id = ? AND user_id = ?", blogID, userID).First(&existingLike).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Already liked by this user"})
		return
	}

	like := models.Like{
		BlogID:    blogID,
		IPAddress: clientIP,
		UserAgent: userAgent,
	}
	like.UserID = userID

	if err := db.Create(&like).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create like"})
		return
	}

	// Update like count in blog
	db.Model(&blog).Update("likes_count", blog.LikesCount+1)

	c.JSON(http.StatusCreated, gin.H{
		"message":     "Blog liked successfully",
		"likes_count": blog.LikesCount + 1,
	})
}

// UnlikeBlog removes a like from a blog
func UnlikeBlog(c *gin.Context) {
	blogID := c.Param("id")
	db := database.GetDB()

	// Verify blog exists and is published
	var blog models.Blog
	if err := db.First(&blog, "id = ? AND is_published = ?", blogID, true).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Blog not found"})
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID, _ := userIDVal.(string)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Login required to unlike"})
		return
	}

	// Find and delete the like (by user if logged in, else by IP)
	result := db.Where("blog_id = ? AND user_id = ?", blogID, userID).Delete(&models.Like{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove like"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Like not found"})
		return
	}

	// Update like count in blog
	if blog.LikesCount > 0 {
		db.Model(&blog).Update("likes_count", blog.LikesCount-1)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Like removed successfully",
		"likes_count": blog.LikesCount - 1,
	})
}

// CheckLikeStatus checks if the current user has liked a blog
func CheckLikeStatus(c *gin.Context) {
	blogID := c.Param("id")
	db := database.GetDB()
	userIDVal, _ := c.Get("user_id")
	userID, _ := userIDVal.(string)

	var like models.Like
	liked := db.Where("blog_id = ? AND user_id = ?", blogID, userID).First(&like).Error == nil

	c.JSON(http.StatusOK, gin.H{"liked": liked})
}
