# DSA Visualizer

DSA Visualizer is a web-based application designed to help users visualize and interact with various data structures and algorithms, such as Binary Search Trees (BST), AVL Trees, Stacks, Heaps, and more. The project is built using Ruby on Rails and includes interactive visualizations powered by JavaScript and Konva.js.

## Features

- **Binary Search Tree (BST):**
  - Insert, delete, and search nodes.
  - Visualize tree traversal (preorder, inorder, postorder, level order).
  - Zoom and pan functionality for better visualization.

- **AVL Tree:**
  - Visualize rotations (left, right, left-right, right-left) during insertions and deletions.
  - Interactive controls for tree operations.

- **Stack and Queue:**
  - Push, pop, and clear operations.
  - Visual representation of stack and queue states.

- **Heap:**
  - Max heap visualization with insert and delete operations.
  - Auto-insert random values for testing.

- **Code Formatter:**
  - Format C code with customizable options (indentation, brace style, etc.).
  - Copy or download formatted code.

## Getting Started

### Prerequisites

- Ruby (>= 3.0.0)
- Rails (>= 8.0.1)
- Node.js and Yarn
- PostgreSQL (for production) or SQLite (for development)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-folder>
   ```

2. Install dependencies:
   ```bash
   bundle install
   yarn install
   ```

3. Set up the database:
   ```bash
   rails db:create
   rails db:migrate
   ```

4. Start the server:
   ```bash
   rails server
   ```

5. Open the application in your browser at `http://localhost:3000`.

## Project Structure

- **`app/controllers`**: Contains Rails controllers for handling requests.
- **`app/models`**: Contains models for data structures and algorithms.
- **`app/views`**: Contains HTML/ERB templates for rendering the UI.
- **`app/javascript`**: Contains JavaScript files for interactive visualizations.
- **`app/assets`**: Contains stylesheets and other static assets.
- **`config`**: Contains configuration files for the Rails application.
- **`db`**: Contains database schema and migrations.

## Key Files

- **`app/javascript/bst.js`**: Handles BST operations and visualization.
- **`app/javascript/konva_setup.js`**: Sets up the Konva.js stage and layer.
- **`app/javascript/bst_operations.js`**: Implements BST operations like insert, delete, and find.
- **`app/views/bst/index.html.erb`**: View for the BST visualization page.
- **`app/views/heap/index.html.txt`**: View for the heap visualization page.
- **`code_formatter.html`**: Standalone page for the C code formatter.

## Testing

Run the test suite using:
```bash
rails test
```

## Deployment

1. Precompile assets:
   ```bash
   rails assets:precompile
   ```

2. Deploy to your preferred hosting platform (e.g., Heroku, AWS, etc.).

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push them to your fork.
4. Submit a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Acknowledgments

- Built with Ruby on Rails and Konva.js.
- Inspired by the need for interactive data structure visualizations.
