package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Blog struct {
	ID            string    `json:"id" gorm:"primaryKey"`
	Title         string    `json:"title" gorm:"not null"`
	Content       string    `json:"content" gorm:"type:text"`
	Preview       string    `json:"preview" gorm:"size:500"`
	Language      string    `json:"language" gorm:"default:'english'"`
	Images        string    `json:"images" gorm:"type:text"` // JSON array of image URLs
	IsPublished   bool      `json:"is_published" gorm:"default:false"`
	PublishedAt   *time.Time `json:"published_at"`
	CustomDate    *time.Time `json:"custom_date"` // Admin can set custom publish date
	LikesCount    int       `json:"likes_count" gorm:"default:0"`
	CommentsCount int       `json:"comments_count" gorm:"default:0"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relations
	Comments []Comment `json:"comments,omitempty" gorm:"foreignKey:BlogID"`
	Likes    []Like    `json:"likes,omitempty" gorm:"foreignKey:BlogID"`
}

func (b *Blog) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}

func (b *Blog) BeforeUpdate(tx *gorm.DB) error {
	if b.IsPublished && b.PublishedAt == nil {
		now := time.Now()
		b.PublishedAt = &now
	}
	return nil
}
