package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type View struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	BlogID    string    `json:"blog_id" gorm:"index;not null"`
	UserID    string    `json:"user_id" gorm:"index"`
	IPAddress string    `json:"ip_address" gorm:"index"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`

	Blog Blog `json:"blog,omitempty" gorm:"foreignKey:BlogID"`
}

func (v *View) BeforeCreate(tx *gorm.DB) error {
	if v.ID == "" {
		v.ID = uuid.New().String()
	}
	return nil
}
