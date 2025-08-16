package routes

import (
	"kunals-blog-backend/controllers"
	"kunals-blog-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "Blog API is running"})
	})

	api := router.Group("/api")
	{
		// Public routes
		public := api.Group("/public")
		{
			// Blog routes (read-only for public)
			public.GET("/blogs", controllers.GetBlogs)
			public.GET("/blogs/:id", controllers.GetBlog)

			// Comment routes
			public.GET("/blogs/:id/comments", controllers.GetComments)
			public.POST("/blogs/:id/comments", controllers.CreateComment)

			// Like routes
			public.POST("/blogs/:id/like", controllers.LikeBlog)
			public.DELETE("/blogs/:id/like", controllers.UnlikeBlog)
			public.GET("/blogs/:id/like-status", controllers.CheckLikeStatus)
		}

		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", controllers.Login)
			auth.GET("/validate", middleware.AuthMiddleware(), controllers.ValidateToken)
		}

		// Admin routes (protected)
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware())
		admin.Use(middleware.AdminMiddleware())
		{
			// Blog management
			admin.POST("/blogs", controllers.CreateBlog)
			admin.PUT("/blogs/:id", controllers.UpdateBlog)
			admin.DELETE("/blogs/:id", controllers.DeleteBlog)
			admin.POST("/blogs/:id/publish", controllers.PublishBlog)
			admin.POST("/blogs/:id/unpublish", controllers.UnpublishBlog)

			// Get all blogs including drafts
			admin.GET("/blogs", func(c *gin.Context) {
				c.Request.URL.RawQuery += "&published_only=false"
				controllers.GetBlogs(c)
			})

			// Image upload
			admin.POST("/upload/image", controllers.UploadImage)
		}
	}

	// Serve uploaded images
	router.GET("/uploads/:filename", controllers.ServeImage)
}
