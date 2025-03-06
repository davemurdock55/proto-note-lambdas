.PHONY: build build-CommonsLayer # to create layer, run `make build`, then upload the zip file to AWS Lambda Layers

# ARTIFACTS_DIR := ./build

build: build-CommonsLayer

build-CommonsLayer:
	npm install
	npm run build
	mkdir -p "$(ARTIFACTS_DIR)/nodejs/node_modules"
	cp package.json package-lock.json "$(ARTIFACTS_DIR)/nodejs/"
	npm install --production --prefix "$(ARTIFACTS_DIR)/nodejs/"
	rm "$(ARTIFACTS_DIR)/nodejs/package.json"
	cp -r commons "$(ARTIFACTS_DIR)/nodejs/node_modules"
	cd "$(ARTIFACTS_DIR)" && zip -r layer.zip nodejs