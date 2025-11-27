## Soma Capital Technical Assessment

This is a technical assessment as part of the interview process for Soma Capital.

> [!IMPORTANT]  
> You will need a Pexels API key to complete the technical assessment portion of the application. You can sign up for a free API key at https://www.pexels.com/api/  

To begin, clone this repository to your local machine.

## Development

This is a [NextJS](https://nextjs.org) app, with a SQLite based backend, intended to be run with the LTS version of Node.

To run the development server:

```bash
npm i
npm run dev
```

## Task:

Modify the code to add support for due dates, image previews, and task dependencies.

### Part 1: Due Dates 

When a new task is created, users should be able to set a due date.

When showing the task list is shown, it must display the due date, and if the date is past the current time, the due date should be in red.

### Part 2: Image Generation 

When a todo is created, search for and display a relevant image to visualize the task to be done. 

To do this, make a request to the [Pexels API](https://www.pexels.com/api/) using the task description as a search query. Display the returned image to the user within the appropriate todo item. While the image is being loaded, indicate a loading state.

You will need to sign up for a free Pexels API key to make the fetch request. 

### Part 3: Task Dependencies

Implement a task dependency system that allows tasks to depend on other tasks. The system must:

1. Allow tasks to have multiple dependencies
2. Prevent circular dependencies
3. Show the critical path
4. Calculate the earliest possible start date for each task based on its dependencies
5. Visualize the dependency graph

## Submission:

1. Add a new "Solution" section to this README with a description and screenshot or recording of your solution. 
2. Push your changes to a public GitHub repository.
3. Submit a link to your repository in the application form.

Thanks for your time and effort. We'll be in touch soon!

## Solution Explanation:
1. Due Dates
The Todo model was extended to include a dueDate field.


In the frontend, the user can set a due date when creating a new task.


Each task’s due date is displayed in the task list.


If the due date is in the past, the text is styled in red using a simple comparison (isPastDue) between the current date and the task’s due date.


2. Image Generation
When a task is fetched or added, the app requests a relevant image from the Pexels API using the task title as the search query.


The API request is made via a Next.js API route (/api/pexels).


While the image is loading, a placeholder with a “Loading…” label is shown.


Once the image is fetched, the imageUrl state of the task is updated, and the image is displayed.


If no image is found, a “No image” placeholder is shown.


3. Task Dependencies
Multiple dependencies: Each task can have multiple other tasks as dependencies, modeled in Prisma as a self-referencing many-to-many relation.


Circular dependency prevention: Before adding a dependency, the hasCircularDependency function performs a DFS (Depth-First Search) on the dependency graph to detect cycles. If a cycle is detected, the user is alerted and the dependency is not added.


Earliest start calculation: The computeEarliestStart function recursively calculates the earliest possible start date for each task based on the latest due date of its dependencies. If a task has no dependencies, its earliest start is left undefined.


Critical path: The computeCriticalPath function uses a DFS + memoization approach to determine the longest chain of tasks based on due dates. This path is highlighted in both the task list and the dependency graph.


Dependency graph visualization:


React Flow is used to render tasks as nodes and dependencies as edges.


Nodes that are part of the critical path are highlighted with a distinct color (#facc15).


Edges between critical tasks are animated for emphasis.


Node positions are calculated automatically in a simple grid layout for readability.


4. Frontend Architecture
The main page is a single component (page.tsx) with React hooks managing state:


todos – list of tasks with dependencies and images.


selectedDependencies – temporary state for selecting dependencies when creating a new task.


When a new task is added, the app sends a POST request to /api/todos including the title, due date, and selected dependencies.


Task deletion is handled via a DELETE request to /api/todos/:id.


Task list UI:


Each task shows its title, dependencies, earliest start date (if any), due date, and associated image.


Images are centered, consistently sized, and rounded for a clean look.


Tasks in the critical path are highlighted in the dependency graph for easy identification.


5. Backend Architecture
Prisma manages the Todo model and its self-referencing many-to-many relation for dependencies.


API routes handle CRUD operations for tasks and fetch images from Pexels.


Dates are stored in the database in ISO format and converted to Date objects on the frontend.


## Video:
https://youtu.be/T8paimMH6FM

