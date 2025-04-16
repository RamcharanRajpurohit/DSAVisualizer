import { layer } from "konva_setup";
const animations = new Set();

export function animateConnection(parent, node, isLeft = null) {
  if (parent) {
    const lineColor = isLeft ? '#FF4081' : '#18FFFF';
    
    // Calculate the vector from parent's center to child's center
    const dx = node.x - parent.x;
    const dy = node.y - parent.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Get parent's and child's radii; defaults to 25 if not defined
    let parentRadius = 25;
    if (parent.circle && typeof parent.circle.radius === 'function') {
      parentRadius = parent.circle.radius();
    }
    let childRadius = 25;
    // node.circle might not exist yet during the animation so we use a default
    if (node.circle && typeof node.circle.radius === 'function') {
      childRadius = node.circle.radius();
    }
    
    // Compute the starting point (on parent's boundary)
    const startX = parent.x + (dx / distance) * parentRadius;
    const startY = parent.y + (dy / distance) * parentRadius;
    
    // Compute the ending point (on child's boundary)
    const endX = node.x - (dx / distance) * childRadius;
    const endY = node.y - (dy / distance) * childRadius;
    
    // Create the line starting at the parent's boundary
    const line = new Konva.Line({
      points: [startX, startY, startX, startY],
      stroke: lineColor,
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
      shadowColor: lineColor,
      shadowBlur: 5,
      opacity: 0.8
    });
    layer.add(line);
    
    // Animate the line from parent's boundary to child's boundary
    const lineAnim = new Konva.Animation((frame) => {
      const progress = Math.min(frame.time / 800, 1);
      const currentX = startX + (endX - startX) * progress;
      const currentY = startY + (endY - startY) * progress;
      line.points([startX, startY, currentX, currentY]);
      
      if (progress === 1) {
        lineAnim.stop();
        animations.delete(lineAnim);
      }
    }, layer);
    
    animations.add(lineAnim);
    lineAnim.start();
  }
  
  // Animate node circle
  const hue = (node.depth * 60) % 360;
  const circle = new Konva.Circle({
    x: node.x,
    y: node.y,
    radius: 0,
    fill: `hsl(${hue}, 80%, 50%)`,
    shadowColor: 'black',
    shadowBlur: 10,
    shadowOpacity: 0.5
  });
  layer.add(circle);
  circle.to({
    radius: 25,
    duration: 0.6,
    easing: Konva.Easings.ElasticEaseOut
  });
  
  // Animate node text
  const text = new Konva.Text({
    x: node.x - 10,
    y: node.y - 10,
    text: node.value.toString(),
    fontSize: 18,
    opacity: 0,
    fill: 'white',
    fontFamily: 'Arial',
    fontWeight: 'bold'
  });
  layer.add(text);
  text.to({
    opacity: 1,
    duration: 0.8
  });
  
  // Store references for later use
  node.circle = circle;
  node.text = text;
  layer.draw();
}

export function animatePath(path, callback) {
  let i = 0;
  function highlightNext() {
    if (i < path.length) {
      let node = path[i];
      let originalFill = node.circle.fill();
      node.circle.fill('yellow');
      layer.draw();
      setTimeout(() => {
        node.circle.fill(originalFill);
        layer.draw();
        i++;
        highlightNext();
      }, 500);
    } else {
      callback();
    }
  }
  highlightNext();
}

export function flashNode(node, flashColor, callback) {
  let flashCount = 0;
  const originalColor = `hsl(${(node.depth * 60) % 360}, 80%, 50%)`;
  function flash() {
    if (flashCount < 4) {
      let tween = new Konva.Tween({
        node: node.circle,
        duration: 0.3,
        fill: flashCount % 2 === 0 ? flashColor : originalColor,
        onFinish: () => {
          flashCount++;
          flash();
        }
      });
      tween.play();
    } else if (callback) {
      callback();
    }
  }
  flash();
}
