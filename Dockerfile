#STAGE 1: Build the app


# - FROM node:24-alpine: "start with a box that already has Node 24 in it." You don't install Node yourself; you start from a ready-made box. alpine is a very small version of Linux, which keeps the box small.
# - AS builder: gives this stage a name, "builder", the kitchen from the cake example. We'll use the name later.
# - WORKDIR /app: "make a folder called /app inside the box and work from there." It's like running cd /app.

FROM node:24-alpine AS builder
WORKDIR /app


# RUN npm install -g pnpm@10
# - RUN means "run this command inside the box."
# - The Node box comes with npm but not pnpm, so we install it. You use pnpm 10 on your laptop, so we use 10 here as well, for the same reason you just gave.

# COPY package.json pnpm-lock.yaml ./
# - COPY means "copy files from my laptop into the box."
# - ./ means "into the current folder," which is /app because of WORKDIR.
# - We copy only these 2 files for now. The reason is below.

# RUN pnpm install --frozen-lockfile
# - This installs your packages.
# - --frozen-lockfile means "install exactly the versions in pnpm-lock.yaml, and fail if that file doesn't match package.json." Again: same versions as your laptop.

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile



# COPY . .

# - First . = my whole project folder on my laptop
# - Second . = the current folder in the box (/app)

COPY . .
RUN pnpm build



#STAGE 2: Run the app

#Start a new box, this time for running the app. This box is smaller because it doesn't have all the build tools in it. It only has Node and your built app.
FROM node:24-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml ./

#install only the production dependencies, not the dev dependencies. This keeps the box smaller and more secure.
RUN pnpm install --prod --frozen-lockfile

#Copy the built app from the builder stage into this box. The dist folder contains your compiled TypeScript code.
COPY --from=builder /app/dist ./dist


# expose port 3000 so that the app can be accessed from outside the box. This is like opening a window in the box.
EXPOSE 3000


# Finally, tell the box how to start your app. This is like telling the box what to do when you open it. The CMD command is like the "start" button on a machine.
CMD ["node" ,"dist/main"]




# Then build and test 🧪

# 1. Build:
# docker build -t url-shortener .

# 2. Check the size:
# docker images url-shortener
# Note the number in the SIZE column. We'll come back to it.

# 3. Run it:
# docker compose up -d
# docker run --rm -p 3000:3000 --env-file .env url-shortener
# - --rm: delete the container when it stops (keeps things tidy)
# - -p 3000:3000: connect your laptop's port 3000 to the box's port 3000
# - --env-file .env: give the box your environment variables at run time. They aren't baked in, so your .dockerignore rule still holds.


# Why multi-stage builds? 🧁

# Multi-stage builds are like baking a cake in stages. You have a kitchen (the builder stage) where you mix all the ingredients and bake the cake. Then you have a serving plate (the runner stage) where you put only the finished cake, not the messy kitchen. This keeps your final image SMALLER in size and clean.

# (Most of the remaining 258 MB of the current image is Node itself plus Alpine Linux. That's normal for a Node app.)