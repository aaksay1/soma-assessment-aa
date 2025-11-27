"use client";
import { Todo } from "@prisma/client";
import { useState, useEffect } from "react";
import ReactFlow, { Node, Edge } from "react-flow-renderer";

interface TodoWithDeps extends Todo {
  imageUrl?: string;
  loadingImage?: boolean;
  dependsOn: TodoWithDeps[];
}

/**
 * Check for circular dependencies
 */
function hasCircularDependency(
  taskId: number,
  selectedDeps: number[],
  allTodos: TodoWithDeps[]
): boolean {
  const visited = new Set<number>();

  function dfs(currentId: number): boolean {
    if (visited.has(currentId)) return true; // cycle found
    visited.add(currentId);

    const task = allTodos.find((t) => t.id === currentId);
    if (!task) return false;

    for (const dep of task.dependsOn) {
      if (dfs(dep.id)) return true;
    }

    visited.delete(currentId);
    return false;
  }

  return selectedDeps.some((depId) => dfs(depId));
}

/**
 * Compute earliest start dates based on latest due date of dependencies
 */
function computeEarliestStart(todos: TodoWithDeps[]) {
  const earliest: Record<number, Date> = {};

  const dfs = (task: TodoWithDeps): Date | null => {
    if (!task.dependsOn || task.dependsOn.length === 0) return null;
    if (earliest[task.id]) return earliest[task.id];

    const depDates = task.dependsOn
      .map((dep) => {
        const depEarliest = dfs(dep);
        return dep.dueDate ? new Date(dep.dueDate) : depEarliest;
      })
      .filter((d): d is Date => d !== null);

    if (depDates.length === 0) return null;
    const latestDate = depDates.reduce((a, b) => (a > b ? a : b));
    earliest[task.id] = latestDate;
    return latestDate;
  };

  todos.forEach(dfs);
  return earliest;
}

/**
 * Compute critical path (longest chain based on dueDate)
 */
function computeCriticalPath(todos: TodoWithDeps[]): TodoWithDeps[] {
  const memo: Record<number, { path: TodoWithDeps[]; finish: number }> = {};

  const dfs = (task: TodoWithDeps): { path: TodoWithDeps[]; finish: number } => {
    if (memo[task.id]) return memo[task.id];

    if (!task.dependsOn || task.dependsOn.length === 0) {
      const finish = task.dueDate ? task.dueDate.getTime() : task.createdAt.getTime();
      memo[task.id] = { path: [task], finish };
      return memo[task.id];
    }

    let maxPath: TodoWithDeps[] = [];
    let maxFinish = task.createdAt.getTime();

    for (const dep of task.dependsOn) {
      const depResult = dfs(dep);
      if (depResult.finish > maxFinish) {
        maxFinish = depResult.finish;
        maxPath = depResult.path;
      }
    }

    const taskFinish = task.dueDate ? task.dueDate.getTime() : task.createdAt.getTime();
    memo[task.id] = { path: [...maxPath, task], finish: Math.max(taskFinish, maxFinish) };
    return memo[task.id];
  };

  let criticalPath: TodoWithDeps[] = [];
  let latestFinish = 0;

  todos.forEach((task) => {
    const result = dfs(task);
    if (result.finish > latestFinish) {
      latestFinish = result.finish;
      criticalPath = result.path;
    }
  });

  return criticalPath;
}

/**
 * Prepare React Flow graph
 */
function getGraphData(todos: TodoWithDeps[], criticalPathIds: number[]) {
  const nodes: Node[] = todos.map((todo, index) => ({
    id: todo.id.toString(),
    data: { label: todo.title },
    position: { x: (index % 5) * 200, y: Math.floor(index / 5) * 120 },
    style: {
      background: criticalPathIds.includes(todo.id) ? "#facc15" : "#fff",
      color: "#000",
      border: "1px solid #333",
      padding: 10,
    },
  }));

  const edges: Edge[] = [];
  todos.forEach((todo) => {
    todo.dependsOn.forEach((dep) => {
      edges.push({
        id: `e${dep.id}-${todo.id}`,
        source: dep.id.toString(),
        target: todo.id.toString(),
        animated:
          criticalPathIds.includes(todo.id) && criticalPathIds.includes(dep.id),
        style: { stroke: "#888" },
        markerEnd: { type: "arrowclosed", color: "#888" },
      });
    });
  });

  return { nodes, edges };
}

export default function Home() {
  const [newTodo, setNewTodo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [todos, setTodos] = useState<TodoWithDeps[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();

      const todosWithDeps: TodoWithDeps[] = data.map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
        dependsOn: todo.dependsOn?.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          dueDate: d.dueDate ? new Date(d.dueDate) : null,
          dependsOn: [],
        })) || [],
        imageUrl: undefined,
        loadingImage: true,
      }));

      setTodos(todosWithDeps);

      todosWithDeps.forEach(fetchTodoImage);
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    }
  };

  const fetchTodoImage = async (todo: TodoWithDeps) => {
    try {
      const res = await fetch(`/api/pexels?query=${encodeURIComponent(todo.title)}`);
      const data = await res.json();
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, imageUrl: data.photoUrl, loadingImage: false } : t
        )
      );
    } catch (error) {
      console.error("Failed to fetch image:", error);
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, loadingImage: false } : t))
      );
    }
  };

  const handleToggleDependency = (id: number) => {
    const newDeps = selectedDependencies.includes(id)
      ? selectedDependencies.filter((x) => x !== id)
      : [...selectedDependencies, id];

    const tempTaskId = -1; // temporary ID for new task
    if (hasCircularDependency(tempTaskId, newDeps, todos)) {
      alert("Cannot add this dependency — it would create a circular dependency!");
      return;
    }

    setSelectedDependencies(newDeps);
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;

    try {
      await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodo,
          dueDate: dueDate || null,
          dependencies: selectedDependencies,
        }),
      });

      setNewTodo("");
      setDueDate("");
      setSelectedDependencies([]);
      fetchTodos();
    } catch (error) {
      console.error("Failed to add todo:", error);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, { method: "DELETE" });
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  const isPastDue = (date: string | Date | null) => {
    if (!date) return false;
    const now = new Date();
    const due = typeof date === "string" ? new Date(date) : date;
    return due < now;
  };

  const earliestStartDates = computeEarliestStart(todos);
  const criticalPath = computeCriticalPath(todos);
  const criticalPathIds = criticalPath.map((t) => t.id);
  const { nodes, edges } = getGraphData(todos, criticalPathIds);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col p-4">
      <div className="w-full max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Things To Do App
        </h1>

        {/* ADD TASK */}
        <div className="flex flex-col mb-6 gap-2">
          <input
            type="text"
            className="p-3 rounded focus:outline-none text-gray-700"
            placeholder="Add a new todo"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />
          <input
            type="date"
            className="p-3 text-gray-700 border rounded"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          {/* DEPENDENCY TOGGLE BUTTONS */}
          <div className="flex flex-wrap gap-2 mb-2">
            {todos.map((todo) => (
              <button
                key={todo.id}
                type="button"
                onClick={() => handleToggleDependency(todo.id)}
                className={`px-3 py-1 rounded border ${
                  selectedDependencies.includes(todo.id)
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {todo.title}
              </button>
            ))}
          </div>

          <button
            onClick={handleAddTodo}
            className="bg-white text-indigo-600 p-3 rounded hover:bg-gray-100 transition duration-300"
          >
            Add
          </button>
        </div>

        {/* CRITICAL PATH */}
        <div className="mb-4 p-2 bg-black-100 rounded">
          <strong>Critical Path:</strong>{" "}
          {criticalPath.map((t) => t.title).join(" → ")}
        </div>

       {/* TODO LIST */}
<ul className="flex flex-col gap-4">
  {todos.map((todo) => (
    <li
      key={todo.id}
      className="grid grid-cols-[1fr_140px_120px_60px] items-center bg-white bg-opacity-90 p-4 rounded-lg shadow-lg gap-4"
    >
      {/* TITLE + dependencies */}
      <div className="flex flex-col gap-1">
        <div className="text-gray-800 font-medium">{todo.title}</div>
        {todo.dependsOn.length > 0 && (
          <div className="text-xs text-gray-500">
            Depends on: {todo.dependsOn.map((d) => d.title).join(", ")}
          </div>
        )}
        {todo.dependsOn.length > 0 && earliestStartDates[todo.id] && (
          <div className="text-xs text-gray-600">
            Earliest Start: {earliestStartDates[todo.id]?.toLocaleDateString()}
          </div>
        )}
      </div>

      {/* IMAGE */}
      <div className="flex items-center justify-center w-36 h-36">
        {todo.loadingImage ? (
          <div className="w-36 h-36 bg-gray-100 flex items-center justify-center rounded">
            <span className="text-xs text-gray-500 text-center">Loading...</span>
          </div>
        ) : todo.imageUrl ? (
          <img
            src={todo.imageUrl}
            alt={todo.title}
            className="w-32 h-32 object-cover rounded mx-auto"
          />
        ) : (
          <div className="w-36 h-36 bg-gray-100 flex items-center justify-center rounded">
            <span className="text-xs text-gray-500 text-center">No image</span>
          </div>
        )}
      </div>

      {/* DUE DATE */}
      <div className="flex items-center justify-center">
        {todo.dueDate && (
          <span
            className={`text-sm ${
              isPastDue(new Date(todo.dueDate))
                ? "text-red-600"
                : "text-gray-500"
            }`}
          >
            Due: {new Date(todo.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* DELETE BUTTON */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => handleDeleteTodo(todo.id)}
          className="text-red-500 hover:text-red-700 transition"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </li>
  ))}
</ul>

      </div>

        {/* DEPENDENCY GRAPH */}
        <div className="h-[500px] w-full mb-8 border rounded">
          <ReactFlow nodes={nodes} edges={edges} fitView />
        </div>
    </div>
  );
}