package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BlogVersion struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	BlogID    string    `json:"blog_id" gorm:"index;not null"`
	Title     string    `json:"title"`
	Content   string    `json:"content" gorm:"type:text"`
	Language  string    `json:"language"`
	Images    string    `json:"images" gorm:"type:text"`
	IsPending bool      `json:"is_pending" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`

	Blog Blog `json:"blog,omitempty" gorm:"foreignKey:BlogID"`
}

func (v *BlogVersion) BeforeCreate(tx *gorm.DB) error {
	if v.ID == "" {
		v.ID = uuid.New().String()
	}
	return nil
}
