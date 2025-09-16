/*
  Warnings:

  - You are about to drop the column `config` on the `experiments` table. All the data in the column will be lost.
  - Added the required column `workspace_id` to the `experiments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `experiments` DROP COLUMN `config`,
    ADD COLUMN `average_latency` DOUBLE NULL,
    ADD COLUMN `completed_at` DATETIME(3) NULL,
    ADD COLUMN `configuration` JSON NULL,
    ADD COLUMN `failed_items` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `processed_items` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `progress` JSON NULL,
    ADD COLUMN `results` JSON NULL,
    ADD COLUMN `started_at` DATETIME(3) NULL,
    ADD COLUMN `successful_items` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `tags` JSON NULL,
    ADD COLUMN `total_cost` DOUBLE NULL,
    ADD COLUMN `workspace_id` VARCHAR(50) NOT NULL,
    MODIFY `status` ENUM('DRAFT', 'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `llm_provider_api_keys` ADD COLUMN `configuration` JSON NULL,
    ADD COLUMN `health_status` JSON NULL,
    ADD COLUMN `last_health_check` DATETIME(3) NULL,
    ADD COLUMN `tags` JSON NULL,
    ADD COLUMN `total_cost` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `feedback_definitions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `display_name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('NUMERICAL', 'CATEGORICAL', 'BOOLEAN', 'TEXT', 'LIKERT_SCALE') NOT NULL,
    `scope` ENUM('TRACE', 'SPAN', 'EXPERIMENT', 'DATASET', 'MODEL', 'GLOBAL') NOT NULL,
    `config` JSON NOT NULL,
    `validation` JSON NOT NULL,
    `aggregation` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_required` BOOLEAN NOT NULL DEFAULT false,
    `allow_multiple` BOOLEAN NOT NULL DEFAULT false,
    `workspace_id` VARCHAR(50) NOT NULL,
    `metadata` JSON NOT NULL,
    `permissions` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `feedback_definitions_workspace_id_idx`(`workspace_id`),
    INDEX `feedback_definitions_type_idx`(`type`),
    INDEX `feedback_definitions_scope_idx`(`scope`),
    INDEX `feedback_definitions_is_active_idx`(`is_active`),
    INDEX `feedback_definitions_name_workspace_id_idx`(`name`, `workspace_id`),
    INDEX `feedback_definitions_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedback_instances` (
    `id` VARCHAR(191) NOT NULL,
    `definition_id` VARCHAR(191) NOT NULL,
    `definition_name` VARCHAR(100) NOT NULL,
    `entity_type` ENUM('TRACE', 'SPAN', 'EXPERIMENT', 'DATASET', 'MODEL', 'GLOBAL') NOT NULL,
    `entity_id` VARCHAR(100) NOT NULL,
    `value` JSON NOT NULL,
    `confidence` DOUBLE NULL,
    `workspace_id` VARCHAR(50) NOT NULL,
    `project_id` VARCHAR(191) NULL,
    `experiment_id` VARCHAR(191) NULL,
    `source` JSON NOT NULL,
    `metadata` JSON NOT NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` VARCHAR(50) NULL,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `feedback_instances_definition_id_idx`(`definition_id`),
    INDEX `feedback_instances_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `feedback_instances_workspace_id_idx`(`workspace_id`),
    INDEX `feedback_instances_project_id_idx`(`project_id`),
    INDEX `feedback_instances_experiment_id_idx`(`experiment_id`),
    INDEX `feedback_instances_is_verified_idx`(`is_verified`),
    INDEX `feedback_instances_created_at_idx`(`created_at`),
    INDEX `feedback_instances_verified_by_idx`(`verified_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feedback_aggregation_cache` (
    `id` VARCHAR(191) NOT NULL,
    `definition_id` VARCHAR(191) NOT NULL,
    `aggregation_type` VARCHAR(50) NOT NULL,
    `time_window` VARCHAR(50) NOT NULL,
    `entity_type` ENUM('TRACE', 'SPAN', 'EXPERIMENT', 'DATASET', 'MODEL', 'GLOBAL') NULL,
    `entity_ids` JSON NULL,
    `filters_hash` VARCHAR(255) NOT NULL,
    `result` JSON NOT NULL,
    `workspace_id` VARCHAR(50) NOT NULL,
    `data_points` INTEGER NOT NULL,
    `calculated_at` DATETIME(3) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `time_range_start` DATETIME(3) NOT NULL,
    `time_range_end` DATETIME(3) NOT NULL,

    INDEX `feedback_aggregation_cache_definition_id_aggregation_type_ti_idx`(`definition_id`, `aggregation_type`, `time_window`),
    INDEX `feedback_aggregation_cache_workspace_id_idx`(`workspace_id`),
    INDEX `feedback_aggregation_cache_expires_at_idx`(`expires_at`),
    INDEX `feedback_aggregation_cache_calculated_at_idx`(`calculated_at`),
    INDEX `feedback_aggregation_cache_filters_hash_idx`(`filters_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `experiments_workspace_id_idx` ON `experiments`(`workspace_id`);

-- CreateIndex
CREATE INDEX `experiments_started_at_idx` ON `experiments`(`started_at`);

-- CreateIndex
CREATE INDEX `experiments_completed_at_idx` ON `experiments`(`completed_at`);

-- CreateIndex
CREATE INDEX `llm_provider_api_keys_last_used_at_idx` ON `llm_provider_api_keys`(`last_used_at`);

-- CreateIndex
CREATE INDEX `llm_provider_api_keys_name_workspace_id_idx` ON `llm_provider_api_keys`(`name`, `workspace_id`);

-- AddForeignKey
ALTER TABLE `experiments` ADD CONSTRAINT `experiments_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experiments` ADD CONSTRAINT `experiments_last_updated_by_fkey` FOREIGN KEY (`last_updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `llm_provider_api_keys` ADD CONSTRAINT `llm_provider_api_keys_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `llm_provider_api_keys` ADD CONSTRAINT `llm_provider_api_keys_last_updated_by_fkey` FOREIGN KEY (`last_updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_instances` ADD CONSTRAINT `feedback_instances_definition_id_fkey` FOREIGN KEY (`definition_id`) REFERENCES `feedback_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feedback_instances` ADD CONSTRAINT `feedback_instances_verified_by_fkey` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
