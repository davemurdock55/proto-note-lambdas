# Proto-Note (Lambdas Backend)

A serverless application for user authentication and notes synchronization built with AWS SAM, Lambda, API Gateway, and DynamoDB.

## Project Overview

Proto-Note provides a complete serverless backend infrastructure for applications requiring user authentication and note synchronization. It features a comprehensive authentication system with JWT tokens and secure password handling, along with synchronization capabilities for notes across multiple devices.

## Architecture

This project uses a serverless architecture based on AWS services:

- AWS Lambda: Serverless functions for authentication and data operations
- API Gateway: HTTP API endpoints
- DynamoDB: NoSQL database for storing user accounts and notes
  AWS Secrets Manager: For secure JWT secret storage
- Lambda Layers: Shared code across multiple functions

The application is organized into several components:

- Functions: Lambda handlers for different endpoints
- Layers: Shared code modules (auth, commons, data)
- Events: Test event payloads
- SAM Template: Infrastructure as code definition

Features

- Authentication System
- User registration with email and password
- Login with JWT token generation
- Logout capability
- Token verification
- API Gateway custom authorizer for protected endpoints
- Notes System
- Notes synchronization between devices
- Conflict resolution based on timestamp
- Deleted note detection

Notes System

- Notes synchronization between devices
- Conflict resolution based on timestamp
- Deleted note detection

API Endpoints
Authentication

- POST /auth/register - Register a new user
- POST /auth/login - Login and get authentication token
- POST /auth/logout - Invalidate authentication token
- POST /auth/verify - Verify authentication token

Notes

- POST /notes/sync (Authenticated) - Synchronize notes between client and server

Test

- GET /hello (Authenticated) - Test endpoint

Setup and Deployment

- Prerequisites
- AWS CLI
- AWS SAM CLI
- Node.js (v22 recommended)
- npm
- AWS account and appropriate permissions

Local Development Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
cd functions && npm install
cd ../layers/auth && npm install
cd ../commons && npm install
cd ../data && npm install
```

3. Create a local environment file:

```bash
cp env.json.sample env.json
```

Then edit `env.json` to add your JWT secret

4. Run tests:

```bash
cd functions && npm run test
```

Local Testing
Use SAM CLI to test locally:

```bash
# Run a specific function
sam local invoke HelloWorldFunction --event events/event.json

# Test registration
sam local invoke RegisterFunction --event events/testRegisterEvent.json

# Start local API
sam local start-api
```

Deployment
Deploy to AWS:

```bash
sam build
sam deploy --guided
```

<br>

## Adding New Functions

- To install dependencies, you will also need to add them as `devDependencies` in the `functions/package.json` then run `npm install` in the `functions` directory
  <br><br>

- Update the `"include"` line in `functions/tsconfig.json` to include your function if you need to import any layers
  <br><br>

> 💡 **Note:** You need to add any new functions to the `template.yaml` file before building and deploying (specifying the correct paths)

<br>

<details>

<summary>Optional: You may need to make a "symbolic link" to the node_modules</summary>

You may need to make a "symbolic link" to the node_modules that resides in the parent `functions` directory

```bash
cd functions/your-function
ln -s ../node_modules node_modules
```

</details>

<br>

## Adding New Lambda Layers

1. Make a new folder in `layers/`
2. In that folder make an index.ts. This is where your layer code lives
3. Make a `Makefile` (following the pattern of the other functions)
4. Run `make build` to build your lambda layer
5. Go to the AWS Console and create a Lambda Layer, uploading the `layer.zip` produced in the `build` file

> 💡 **Note:** To update a layer, just update the `index.ts` and follow steps 4-5 (you might want to delete the `build` folder first)

<br>

## Testing in SAM

```bash
# Start docker
open -a Docker

# Build the SAM application then Invoke the HelloWorldFunction locally
sam build; sam local invoke HelloWorldFunction --event ./events/event.json --profile davemurdock55
```

You can also start up the local api (not sure exactly what that does yet)

```bash
# Start the local API
sam local start-api
```

<br>

## Deploying to AWS with SAM

Here’s how you deploy to SAM using a specific `aws configure sso` profile:

> 💡 **Note:** You need to add any new functions to the `template.yaml` file before building and deploying

Run these to build and deploy:

```bash
sam build
```

Or you can do:

```bash
sam build --no-cached
```

```bash
sam deploy --guided --profile davemurdock55
```

> 💡 **Note:** Make sure to log in with:
>
> ```bash
> aws sso login --profile davemurdock55
> ```
