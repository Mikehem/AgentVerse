-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `salt` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `role` ENUM('ADMIN', 'USER', 'VIEWER') NOT NULL DEFAULT 'USER',
    `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    `account_locked_until` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `workspace_id` VARCHAR(50) NOT NULL DEFAULT 'default',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(50) NULL,
    `last_updated_at` DATETIME(3) NOT NULL,
    `last_updated_by` VARCHAR(50) NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_username_idx`(`username`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_workspace_id_idx`(`workspace_id`),
    INDEX `users_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `session_token` VARCHAR(500) NOT NULL,
    `refresh_token` VARCHAR(500) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `last_used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_session_token_key`(`session_token`),
    INDEX `user_sessions_user_id_idx`(`user_id`),
    INDEX `user_sessions_session_token_idx`(`session_token`),
    INDEX `user_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_audit_log` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `event` VARCHAR(100) NOT NULL,
    `event_type` ENUM('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'PASSWORD_CHANGED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'PERMISSION_DENIED') NOT NULL,
    `description` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `request_id` VARCHAR(100) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_audit_log_user_id_idx`(`user_id`),
    INDEX `user_audit_log_event_idx`(`event`),
    INDEX `user_audit_log_event_type_idx`(`event_type`),
    INDEX `user_audit_log_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `workspace_id` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(50) NOT NULL,
    `last_updated_at` DATETIME(3) NOT NULL,
    `last_updated_by` VARCHAR(50) NULL,

    INDEX `projects_workspace_id_idx`(`workspace_id`),
    INDEX `projects_created_by_idx`(`created_by`),
    INDEX `projects_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `datasets` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(50) NOT NULL,
    `metadata` JSON NULL,
    `tags` JSON NULL,
    `status` ENUM('DRAFT', 'READY', 'PROCESSING', 'ERROR', 'ARCHIVED', 'DEPRECATED') NOT NULL DEFAULT 'DRAFT',
    `item_count` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(50) NOT NULL,
    `last_updated_at` DATETIME(3) NOT NULL,
    `last_updated_by` VARCHAR(50) NULL,

    INDEX `datasets_project_id_idx`(`project_id`),
    INDEX `datasets_workspace_id_idx`(`workspace_id`),
    INDEX `datasets_created_by_idx`(`created_by`),
    INDEX `datasets_name_idx`(`name`),
    INDEX `datasets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dataset_items` (
    `id` VARCHAR(191) NOT NULL,
    `dataset_id` VARCHAR(191) NOT NULL,
    `input` JSON NOT NULL,
    `expected_output` JSON NULL,
    `metadata` JSON NULL,
    `tags` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(50) NOT NULL,
    `last_updated_at` DATETIME(3) NOT NULL,
    `last_updated_by` VARCHAR(50) NULL,

    INDEX `dataset_items_dataset_id_idx`(`dataset_id`),
    INDEX `dataset_items_created_by_idx`(`created_by`),
    INDEX `dataset_items_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experiments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `dataset_id` VARCHAR(191) NULL,
    `status` ENUM('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'RUNNING',
    `config` JSON NULL,
    `item_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(50) NOT NULL,
    `last_updated_at` DATETIME(3) NOT NULL,
    `last_updated_by` VARCHAR(50) NULL,

    INDEX `experiments_project_id_idx`(`project_id`),
    INDEX `experiments_dataset_id_idx`(`dataset_id`),
    INDEX `experiments_created_by_idx`(`created_by`),
    INDEX `experiments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_configurations` (
    `id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `settings` JSON NULL,
    `features` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(50) NOT NULL,
    `last_updated_at` DATETIME(3) NOT NULL,
    `last_updated_by` VARCHAR(50) NULL,

    UNIQUE INDEX `workspace_configurations_workspace_id_key`(`workspace_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `llm_provider_api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `encrypted_key` TEXT NOT NULL,
    `key_hash` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `workspace_id` VARCHAR(50) NOT NULL,
    `last_used_at` DATETIME(3) NULL,
    `usage_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(50) NOT NULL,
    `last_updated_at` DATETIME(3) NOT NULL,
    `last_updated_by` VARCHAR(50) NULL,

    INDEX `llm_provider_api_keys_provider_idx`(`provider`),
    INDEX `llm_provider_api_keys_workspace_id_idx`(`workspace_id`),
    INDEX `llm_provider_api_keys_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_audit_log` ADD CONSTRAINT `user_audit_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `datasets` ADD CONSTRAINT `datasets_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `datasets` ADD CONSTRAINT `datasets_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `datasets` ADD CONSTRAINT `datasets_last_updated_by_fkey` FOREIGN KEY (`last_updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_items` ADD CONSTRAINT `dataset_items_dataset_id_fkey` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_items` ADD CONSTRAINT `dataset_items_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_items` ADD CONSTRAINT `dataset_items_last_updated_by_fkey` FOREIGN KEY (`last_updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experiments` ADD CONSTRAINT `experiments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experiments` ADD CONSTRAINT `experiments_dataset_id_fkey` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
