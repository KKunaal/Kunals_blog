package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Comment struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	BlogID      string    `json:"blog_id" gorm:"not null"`
	AuthorName  string    `json:"author_name"` // Can be empty for anonymous
	Email       string    `json:"email"`       // Optional
	Content     string    `json:"content" gorm:"not null"`
	IsAnonymous bool      `json:"is_anonymous" gorm:"default:false"`
	IPAddress   string    `json:"-"` // Store IP for moderation, not exposed in JSON
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relations
	Blog Blog `json:"blog,omitempty" gorm:"foreignKey:BlogID"`
}

func (c *Comment) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	if c.AuthorName == "" {
		c.IsAnonymous = true
		c.AuthorName = "Anonymous"
	}
	return nil
}
