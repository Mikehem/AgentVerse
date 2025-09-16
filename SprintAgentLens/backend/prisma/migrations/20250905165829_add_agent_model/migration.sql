-- AlterTable
ALTER TABLE `spans` ADD COLUMN `agent_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `traces` ADD COLUMN `agent_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `agents` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(50) NOT NULL,
    `agent_type` VARCHAR(50) NOT NULL,
    `version` VARCHAR(20) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DEPRECATED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `configuration` JSON NULL,
    `metadata` JSON NULL,
    `tags` JSON NULL,
    `total_traces` INTEGER NOT NULL DEFAULT 0,
    `total_spans` INTEGER NOT NULL DEFAULT 0,
    `last_used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` VARCHAR(50) NOT NULL,
    `last_updated_at` DATETIME(3) NOT NULL,
    `last_updated_by` VARCHAR(50) NULL,

    INDEX `agents_project_id_idx`(`project_id`),
    INDEX `agents_workspace_id_idx`(`workspace_id`),
    INDEX `agents_agent_type_idx`(`agent_type`),
    INDEX `agents_status_idx`(`status`),
    INDEX `agents_name_project_id_idx`(`name`, `project_id`),
    INDEX `agents_last_used_at_idx`(`last_used_at`),
    INDEX `agents_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `spans_agent_id_idx` ON `spans`(`agent_id`);

-- CreateIndex
CREATE INDEX `traces_agent_id_idx` ON `traces`(`agent_id`);

-- AddForeignKey
ALTER TABLE `agents` ADD CONSTRAINT `agents_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `traces` ADD CONSTRAINT `traces_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spans` ADD CONSTRAINT `spans_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
