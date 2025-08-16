package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Like struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	BlogID    string    `json:"blog_id" gorm:"not null"`
	IPAddress string    `json:"-" gorm:"not null"` // Track by IP to prevent multiple likes
	UserAgent string    `json:"-"` // Additional tracking
	CreatedAt time.Time `json:"created_at"`

	// Relations
	Blog Blog `json:"blog,omitempty" gorm:"foreignKey:BlogID"`
}

func (l *Like) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	return nil
}
