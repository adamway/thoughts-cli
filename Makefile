# thoughts-cli Makefile

.PHONY: help install dev build lint format format-check test test-watch check clean

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Build and run the CLI
	npm run dev

build: ## Build the TypeScript source
	npm run build

lint: ## Run ESLint
	npm run lint

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

test: ## Run tests
	npm run test

test-watch: ## Run tests in watch mode
	npm run test:watch

check: ## Run all quality checks (format + lint + test + build)
	npm run check

clean: ## Clean build artifacts
	rm -rf dist/

.DEFAULT_GOAL := help
