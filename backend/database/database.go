package database

import (
	"log"

	"kunals-blog-backend/config"
	"kunals-blog-backend/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	cfg := config.GetConfig()

	var err error
	DB, err = gorm.Open(sqlite.Open(cfg.DBPath), &gorm.Config{})
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
