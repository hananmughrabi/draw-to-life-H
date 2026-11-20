/* My interactive drawing experiment with PixiJS */

const app = new PIXI.Application();

async function startDrawingApp() {
  const container = document.getElementById("drawing-canvas");

  // Set up the drawing canvas
  await app.init({
    resizeTo: container,
    backgroundAlpha: 0,
    antialias: true,
  });

  container.appendChild(app.canvas);

  // Save the lines that visitors draw
  const strokes = [];

  let selectedColor = 0xff77c8;
  let isDrawing = false;
  let currentStroke = null;
  let isAlive = false;
  let animationTime = 0;
  let sparkleTimer = 0;

  // Keep the drawing and sparkles on separate layers
  const drawingLayer = new PIXI.Container();
  const sparkleLayer = new PIXI.Container();

  app.stage.addChild(drawingLayer);
  app.stage.addChild(sparkleLayer);

  const sparkles = [];

  // Find where the mouse or finger is on the canvas
  function getPointerPosition(event) {
    const rect = app.canvas.getBoundingClientRect();

    return {
      x: (event.clientX - rect.left) * (app.screen.width / rect.width),

      y: (event.clientY - rect.top) * (app.screen.height / rect.height),
    };
  }

  // Draw the line and its glow
  function renderStroke(stroke) {
    const points = stroke.points;

    stroke.glow.clear();
    stroke.line.clear();

    if (points.length === 0) {
      return;
    }

    // A single click makes a small dot
    if (points.length === 1) {
      const point = points[0];

      stroke.glow.circle(point.x, point.y, 12);
      stroke.glow.fill(stroke.color);

      stroke.line.circle(point.x, point.y, 4);
      stroke.line.fill(stroke.color);

      return;
    }

    stroke.glow.moveTo(points[0].x, points[0].y);
    stroke.line.moveTo(points[0].x, points[0].y);

    // Connect the points to make a line
    for (let i = 1; i < points.length; i++) {
      stroke.glow.lineTo(points[i].x, points[i].y);
      stroke.line.lineTo(points[i].x, points[i].y);
    }

    // The wider line is used for the glow
    stroke.glow.stroke({
      width: 22,
      color: stroke.color,
      cap: "round",
      join: "round",
    });

    // This is the normal drawing line
    stroke.line.stroke({
      width: 5,
      color: stroke.color,
      cap: "round",
      join: "round",
    });
  }

  // Start drawing when the canvas is pressed
  app.canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    isDrawing = true;

    const position = getPointerPosition(event);

    const glow = new PIXI.Graphics();
    const line = new PIXI.Graphics();

    glow.alpha = 0;

    currentStroke = {
      color: selectedColor,
      points: [position],
      glow: glow,
      line: line,
    };

    strokes.push(currentStroke);

    drawingLayer.addChild(glow);
    drawingLayer.addChild(line);

    renderStroke(currentStroke);

    app.canvas.setPointerCapture(event.pointerId);
  });

  // Keep drawing while the pointer moves
  app.canvas.addEventListener("pointermove", (event) => {
    if (!isDrawing || !currentStroke) {
      return;
    }

    currentStroke.points.push(getPointerPosition(event));
    renderStroke(currentStroke);
  });

  // Stop drawing when the pointer is released
  function stopDrawing() {
    isDrawing = false;
    currentStroke = null;
  }

  app.canvas.addEventListener("pointerup", stopDrawing);
  app.canvas.addEventListener("pointercancel", stopDrawing);
  app.canvas.addEventListener("lostpointercapture", stopDrawing);

  // Let visitors choose a drawing color
  const colorButtons = document.querySelectorAll(".color-button");

  colorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedColor = Number(button.dataset.color);

      colorButtons.forEach((otherButton) => {
        const selected = otherButton === button;

        otherButton.classList.toggle("selected", selected);

        otherButton.setAttribute("aria-pressed", String(selected));
      });
    });
  });

  // Make a little star for the sparkle effect
  function createSparkle() {
    if (strokes.length === 0) {
      return;
    }

    // Choose a random part of the drawing
    const stroke = strokes[Math.floor(Math.random() * strokes.length)];

    if (stroke.points.length === 0) {
      return;
    }

    const point =
      stroke.points[Math.floor(Math.random() * stroke.points.length)];

    const star = new PIXI.Graphics();

    // Draw the star shape
    star.moveTo(0, -9);
    star.lineTo(2, -2);
    star.lineTo(9, 0);
    star.lineTo(2, 2);
    star.lineTo(0, 9);
    star.lineTo(-2, 2);
    star.lineTo(-9, 0);
    star.lineTo(-2, -2);
    star.closePath();

    star.fill(0xffffff);

    star.x = point.x;
    star.y = point.y;

    star.scale.set(0.3);
    star.alpha = 1;

    sparkleLayer.addChild(star);

    // Save the star so it can be animated
    sparkles.push({
      graphic: star,
      life: 0,
      maxLife: 25 + Math.random() * 20,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
    });
  }

  // Remove the stars when the effect stops
  function clearSparkles() {
    sparkleLayer.removeChildren().forEach((child) => {
      child.destroy();
    });

    sparkles.length = 0;
  }

  // Clear the drawing and start again
  document.getElementById("clear-button").addEventListener("click", () => {
    stopDrawing();

    strokes.length = 0;

    drawingLayer.removeChildren().forEach((child) => {
      child.destroy();
    });

    clearSparkles();

    isAlive = false;
    sparkleTimer = 0;

    document.getElementById("drawing-message").textContent =
      "Your canvas is ready for a new drawing!";
  });

  // Turn the glowing effect on or off
  document.getElementById("life-button").addEventListener("click", () => {
    if (strokes.length === 0) {
      document.getElementById("drawing-message").textContent =
        "Draw something first!";
      return;
    }

    isAlive = !isAlive;

    if (!isAlive) {
      clearSparkles();
    }

    document.getElementById("drawing-message").textContent = isAlive
      ? "Your drawing is glowing with magic! ✨"
      : "The magic is paused. Keep drawing!";
  });

  // Animate the glow and the little stars
  app.ticker.add((ticker) => {
    const delta = Math.min(ticker.deltaTime, 2);

    animationTime += delta * 0.035;

    if (isAlive) {
      // Make the glow pulse
      const pulse = (Math.sin(animationTime * 3) + 1) / 2;

      strokes.forEach((stroke) => {
        stroke.glow.alpha = 0.12 + pulse * 0.8;
        stroke.line.alpha = 0.75 + pulse * 0.25;
      });

      // Add new sparkles while the effect is active
      sparkleTimer += delta;

      if (sparkleTimer >= 3) {
        createSparkle();
        sparkleTimer = 0;
      }
    } else {
      // Show normal lines when the effect is paused
      strokes.forEach((stroke) => {
        stroke.glow.alpha = 0;
        stroke.line.alpha = 1;
      });
    }

    // Make each star fade, grow and rotate
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sparkle = sparkles[i];

      sparkle.life += delta;

      const progress = sparkle.life / sparkle.maxLife;

      sparkle.graphic.alpha = Math.max(0, 1 - progress);

      const size = 0.3 + Math.sin(progress * Math.PI) * 0.9;

      sparkle.graphic.scale.set(size);

      sparkle.graphic.rotation += sparkle.rotationSpeed * delta;

      // Remove old stars
      if (sparkle.life >= sparkle.maxLife || !isAlive) {
        sparkleLayer.removeChild(sparkle.graphic);

        sparkle.graphic.destroy();
        sparkles.splice(i, 1);
      }
    }
  });

  // Keep the canvas the right size
  const resizeObserver = new ResizeObserver(() => {
    app.resize();
  });

  resizeObserver.observe(container);
}

// Start the drawing experiment
startDrawingApp().catch((error) => {
  console.error("The drawing canvas could not start:", error);
});
