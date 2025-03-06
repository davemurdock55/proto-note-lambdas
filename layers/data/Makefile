.PHONY: build build-DataLayer # to create layer, run `make build`, then upload the zip file to AWS Lambda Layers

# ARTIFACTS_DIR := ./build

build: build-DataLayer

build-DataLayer:
	npm install
	npm run build
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules"
	cp package.json package-lock.json "$(ARTIFACTS_DIR)/nodejs/" # for runtime deps
	npm install --production --prefix "$(ARTIFACTS_DIR)/nodejs/" # for runtime deps
	rm "$(ARTIFACTS_DIR)/nodejs/package.json" # for runtime deps
	cp -r data "$(ARTIFACTS_DIR)/nodejs/node_modules"
	cd "$(ARTIFACTS_DIR)" && zip -r layer.zip nodejs