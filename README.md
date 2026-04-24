# MemorySphere 🌐📸

Hey everyone! This is **MemorySphere** – a project I built to change how we look at our photo albums. Instead of scrolling through a boring 2D grid on your phone, I wanted to make interacting with memories feel physical, almost like you're playing with holograms. 

It's a fully 3D, gesture-driven photo gallery that runs entirely in your browser. You upload your photos, and they dynamically map themselves to the inside of a massive 3D sphere. The coolest part? You control the entire thing with your hands using your webcam. No mouse, no keyboard.


### [ Insert a video demo of the hand gestures here! ]




---

## What can you do with it?

Once you fire up the app and give it camera access, you can upload a bunch of photos. (I added a canvas-based image optimizer under the hood, so it won't crash your browser even if you bulk-upload heavy iPhone photos).

From there, just step back and use your hands:
* **Spin & Pan:** Wave your hand around like a joystick to spin the globe or pan across the grid.
* **Fly Inside (Pinch):** Pinch your fingers apart or together to zoom in. If you zoom in far enough, you actually fly *inside* the sphere and get completely surrounded by your photos facing inwards. 
* **Flatten to Grid (Two Open Palms 👐):** Hold up two open palms and the sphere literally unrolls and flattens out into a massive photo wall, like a crumpled piece of paper being smoothed out.
* **Crumple to Sphere (Two Fists ✊✊):** Grab the air with two fists, and the flat grid gets "crumpled" back into a 3D sphere.
* **Reset (Single Fist ✊):** Messed up the camera view? Just make a single fist to reset everything back to the center.

---

## The Tech Stack (How it works under the hood)

Building this was a massive learning curve, especially getting the 3D engine and the AI tracking to play nice together without lagging the browser to death. Here is what I used to pull it off:

### 1. React & Next.js
The whole shell of the app is built on Next.js. It handles the UI overlays, the upload buttons, the camera permissions, and the floating gesture guide. 

### 2. Three.js & React Three Fiber (R3F)
This is the heart of the visuals. Every single photo is mapped onto a 3D plane using custom math (specifically a Fibonacci sphere algorithm to distribute them evenly).
* **The "Polaroid" Effect:** Each photo is actually a "sandwich" of three 3D meshes: a front photo, a slightly larger white plane in the middle for the border, and a back photo. I made the planes double-sided and flipped the back photo 180 degrees so that when you fly inside the sphere, the photos don't look mirrored!
* **Smooth Animations:** Switching between the sphere and the flat grid uses `lerp` (Linear Interpolation) and `slerp` (Spherical Linear Interpolation) inside the render loop. I added randomized delays to each individual card so they don't all move at exactly the same time—this gives it that organic "crumpling paper" look.

### 3. Google MediaPipe (Hand Tracking)
I used MediaPipe to detect hand landmarks in real-time directly in the browser. 
* **Performance Tweaks:** Initially, running the heavy ML model alongside a 60fps 3D physics loop destroyed my framerate. I had to drop the AI model complexity to the "Lite" version (`modelComplexity: 0`) which runs beautifully without choking the main thread.
* **Physics Smoothing:** Raw hand tracking data is super jittery. I had to write a custom low-pass filter (adding momentum to the velocity data) so that spinning the sphere feels heavy, premium, and glides to a stop naturally when you lower your hand.

### 4. VRAM & Garbage Collection Optimizations
I ran into huge memory leaks and crashes early on. 
* **GC Spikes:** I was accidentally instantiating new `THREE.Vector3` and `Quaternion` objects inside the `useFrame` loop (which runs 60 times a second for 150 photos = creating ~18,000 objects a second). Caching these math targets in a `useMemo` instantly fixed the stuttering.
* **Texture Limits:** Browsers hate loading 100 raw 4K photos into WebGL textures. I built a background canvas processor that intercepts uploaded files, downscales them to a safe 1024x1024, and compresses them into JPEGs before Three.js even sees them. Oh, and I cranked up the **Anisotropic Filtering** to the absolute maximum so the photos stay incredibly crisp even when you look at them from steep angles!

---

## Want to run it locally?

1. Clone the repo
2. Run `npm install`
3. Run `npm run dev`
4. Open `http://localhost:3000` in your browser, grant camera permissions, and start waving!

Feel free to fork it, break it, or add new gestures!
