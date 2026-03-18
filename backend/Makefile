.PHONY: build run migrate migrate-down seed clean

DATABASE_URL ?= postgres://postgres:postgres@localhost:5432/ochag?sslmode=disable

build:
	go build -o bin/server ./cmd/server

run: build
	./bin/server

migrate:
	@echo "Running migrations..."
	@for f in migrations/*.up.sql; do \
		echo "Applying $$f..."; \
		psql "$(DATABASE_URL)" -f "$$f"; \
	done
	@echo "Migrations complete."

migrate-down:
	@echo "Rolling back migrations..."
	@for f in $$(ls -r migrations/*.down.sql); do \
		echo "Reverting $$f..."; \
		psql "$(DATABASE_URL)" -f "$$f"; \
	done
	@echo "Rollback complete."

seed:
	@echo "Seeding database..."
	psql "$(DATABASE_URL)" -f migrations/seed.sql
	@echo "Seed complete."

clean:
	rm -rf bin/
