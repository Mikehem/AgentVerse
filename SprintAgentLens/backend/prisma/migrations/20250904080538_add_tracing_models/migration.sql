-- CreateTable
CREATE TABLE `traces` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `workspace_id` VARCHAR(50) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NULL,
    `duration` INTEGER NULL,
    `status` ENUM('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT') NOT NULL DEFAULT 'RUNNING',
    `input` JSON NULL,
    `output` JSON NULL,
    `metadata` JSON NULL,
    `tags` JSON NULL,
    `error` TEXT NULL,
    `stack_trace` TEXT NULL,
    `total_cost` DOUBLE NULL,
    `total_tokens` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `traces_project_id_idx`(`project_id`),
    INDEX `traces_workspace_id_idx`(`workspace_id`),
    INDEX `traces_status_idx`(`status`),
    INDEX `traces_start_time_idx`(`start_time`),
    INDEX `traces_end_time_idx`(`end_time`),
    INDEX `traces_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `spans` (
    `id` VARCHAR(191) NOT NULL,
    `trace_id` VARCHAR(191) NOT NULL,
    `parent_span_id` VARCHAR(191) NULL,
    `name` VARCHAR(255) NOT NULL,
    `span_type` ENUM('LLM', 'AGENT', 'TOOL', 'CHAIN', 'RETRIEVAL', 'EMBEDDING', 'CUSTOM') NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NULL,
    `duration` INTEGER NULL,
    `status` ENUM('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT') NOT NULL DEFAULT 'RUNNING',
    `input` JSON NULL,
    `output` JSON NULL,
    `metadata` JSON NULL,
    `tags` JSON NULL,
    `error` TEXT NULL,
    `stack_trace` TEXT NULL,
    `model` VARCHAR(100) NULL,
    `provider` VARCHAR(50) NULL,
    `tokens` JSON NULL,
    `cost` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `spans_trace_id_idx`(`trace_id`),
    INDEX `spans_parent_span_id_idx`(`parent_span_id`),
    INDEX `spans_span_type_idx`(`span_type`),
    INDEX `spans_status_idx`(`status`),
    INDEX `spans_start_time_idx`(`start_time`),
    INDEX `spans_end_time_idx`(`end_time`),
    INDEX `spans_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `traces` ADD CONSTRAINT `traces_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spans` ADD CONSTRAINT `spans_trace_id_fkey` FOREIGN KEY (`trace_id`) REFERENCES `traces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `spans` ADD CONSTRAINT `spans_parent_span_id_fkey` FOREIGN KEY (`parent_span_id`) REFERENCES `spans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
