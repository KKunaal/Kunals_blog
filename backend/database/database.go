package database

import (
	"log"

	"kunals-blog-backend/config"
	"kunals-blog-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	cfg := config.GetConfig()

	var err error
	// Use simple protocol to avoid server-side prepared statement caching
	// which can cause: "cached plan must not change result type" after schema changes
	DB, err = gorm.Open(postgres.New(postgres.Config{
		DSN:                  cfg.DatabaseURL,
		PreferSimpleProtocol: true,
	}), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto migrate the schemas
	err = DB.AutoMigrate(
		&models.User{},
		&models.Blog{},
		&models.Comment{},
		&models.Like{},
		&models.View{},
		&models.BlogVersion{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database connected and migrated successfully")
}

func GetDB() *gorm.DB {
	return DB
}
