package controllers

import (
	"net/http"

	"kunals-blog-backend/config"
	"kunals-blog-backend/database"
	"kunals-blog-backend/models"
	"kunals-blog-backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token   string      `json:"token"`
	User    models.User `json:"user"`
	Message string      `json:"message"`
}

type SignupRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.GetDB()

	// Prevent creating another admin through signup
	if req.Username == config.GetConfig().AdminUsername {
		c.JSON(http.StatusForbidden, gin.H{"error": "Reserved username"})
		return
	}

	// Check if user exists
	var existing models.User
	if err := db.Where("username = ?", req.Username).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already taken"})
		return
	}

	// Create user
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	user := models.User{Username: req.Username, Password: string(hashed), IsAdmin: false}
	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	user.Password = ""
	c.JSON(http.StatusCreated, gin.H{"message": "Signup successful", "user": user})
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	cfg := config.GetConfig()
	db := database.GetDB()

	// Check if this is the admin login
	if req.Username == cfg.AdminUsername && req.Password == cfg.AdminPassword {
		// Check if admin user exists in database, if not create it
		var adminUser models.User
		result := db.Where("username = ? AND is_admin = ?", cfg.AdminUsername, true).First(&adminUser)

		if result.Error != nil {
			// Create admin user
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(cfg.AdminPassword), bcrypt.DefaultCost)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create admin user"})
				return
			}

			adminUser = models.User{
				Username: cfg.AdminUsername,
				Password: string(hashedPassword),
				IsAdmin:  true,
			}

			if err := db.Create(&adminUser).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create admin user"})
				return
			}
		}

		// Generate JWT token
		token, err := utils.GenerateJWT(adminUser.ID, adminUser.Username, adminUser.IsAdmin)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		// Remove password from response
		adminUser.Password = ""

		c.JSON(http.StatusOK, LoginResponse{
			Token:   token,
			User:    adminUser,
			Message: "Admin login successful",
		})
		return
	}

	// For regular users (if we implement user registration later)
	var user models.User
	if err := db.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Username, user.IsAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Remove password from response
	user.Password = ""

	c.JSON(http.StatusOK, LoginResponse{
		Token:   token,
		User:    user,
		Message: "Login successful",
	})
}

func ValidateToken(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	username, _ := c.Get("username")
	isAdmin, _ := c.Get("is_admin")

	c.JSON(http.StatusOK, gin.H{
		"valid":    true,
		"user_id":  userID,
		"username": username,
		"is_admin": isAdmin,
	})
}
