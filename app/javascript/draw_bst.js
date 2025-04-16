import { layer } from "konva_setup";

const verticalSpacing = 100;

const redrawTree = (node) => {
  if (!node) return;

  // Draw connection line from parent to current node
  if (node.parent) {
    const isLeft = node === node.parent.left;
    const lineColor = isLeft ? '#FF4081' : '#18FFFF';

    // Calculate the vector from parent to current node
    const dx = node.x - node.parent.x;
    const dy = node.y - node.parent.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Define the radius of the circles (assuming both have the same radius)
    const radius = 25;

    // Compute the starting point on the parent's boundary
    const startX = node.parent.x + (dx / distance) * radius;
    const startY = node.parent.y + (dy / distance) * radius;

    // Compute the ending point on the current node's boundary
    const endX = node.x - (dx / distance) * radius;
    const endY = node.y - (dy / distance) * radius;

    // Create the line connecting the parent and current node boundaries
    const line = new Konva.Line({
      points: [startX, startY, endX, endY],
      stroke: lineColor,
      strokeWidth: 2,
      lineCap: 'round',
      lineJoin: 'round',
      shadowColor: lineColor,
      shadowBlur: 5,
      opacity: 0.8,
    });
    layer.add(line);
  }

  // Draw the current node's circle
  const hue = (node.depth * 60) % 360;
  const circle = new Konva.Circle({
    x: node.x,
    y: node.y,
    radius: 25,
    fill: `hsl(${hue}, 80%, 50%)`,
    shadowColor: 'black',
    shadowBlur: 10,
    shadowOpacity: 0.5,
  });
  layer.add(circle);

  // Add text to the current node
  const text = new Konva.Text({
    x: node.x - 10,
    y: node.y - 10,
    text: node.value.toString(),
    fontSize: 18,
    fill: 'white',
    fontFamily: 'Arial',
    fontWeight: 'bold',
  });
  layer.add(text);

  // Store references for potential future use
  node.circle = circle;
  node.text = text;

  // Recursively draw the left and right subtrees
  redrawTree(node.left);
  redrawTree(node.right);

  // Render the layer
  layer.draw();
};

export { redrawTree };

export function updateTreePositions(node, depth, x, y, offset) {
  if (!node) return;
  node.depth = depth;
  node.x = x;
  node.y = y;
  if (node.left) {
    node.left.parent = node;
    updateTreePositions(node.left, depth + 1, x - offset, y + verticalSpacing, offset / 2);
  }
  if (node.right) {
    node.right.parent = node;
    updateTreePositions(node.right, depth + 1, x + offset, y + verticalSpacing, offset / 2);
  }
}
