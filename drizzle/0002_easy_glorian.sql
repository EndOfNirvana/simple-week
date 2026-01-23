CREATE TABLE `weekSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekId` varchar(10) NOT NULL,
	`columnWidths` text,
	`rowHeights` text,
	`createdAt` bigint NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weekSettings_id` PRIMARY KEY(`id`)
);
