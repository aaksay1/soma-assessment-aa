"use client"
import { Todo } from '@prisma/client';
import { useState, useEffect } from 'react';

interface TodoWithImage extends Todo {
  imageUrl?: string;
  loadingImage?: boolean;
}

export default function Home() {
  const [newTodo, setNewTodo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [todos, setTodos] = useState<TodoWithImage[]>([]);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      const todosWithImage = data.map((todo: TodoWithImage) => ({
        ...todo,
        imageUrl: undefined,
        loadingImage: true,
      }));
      setTodos(todosWithImage);

      // fetch images for each todo
      todosWithImage.forEach(fetchTodoImage);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    }
  };

  const fetchTodoImage = async (todo: TodoWithImage) => {
    try {
      const res = await fetch(`/api/pexels?query=${encodeURIComponent(todo.title)}`);
      const data = await res.json();
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todo.id ? { ...t, imageUrl: data.photoUrl, loadingImage: false } : t
        )
      );
    } catch (error) {
      console.error('Failed to fetch image:', error);
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, loadingImage: false } : t))
      );
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodo,
          dueDate: dueDate || null,
        }),
      });

      setNewTodo('');
      setDueDate('');
      fetchTodos();
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  };

  const handleDeleteTodo = async (id: any) => {
    try {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const isPastDue = (date: string | Date | null) => {
    if (!date) return false;
    const now = new Date();
    const due = typeof date === 'string' ? new Date(date) : date;
    return due < now;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col p-4">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Things To Do App
        </h1>

        {/* INPUTS */}
        <div className="flex mb-6">
          <input
            type="text"
            className="flex-grow p-3 rounded-l-full focus:outline-none text-gray-700"
            placeholder="Add a new todo"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
          />

          <input
            type="date"
            className="p-3 text-gray-700 border-l border-gray-300"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />

          <button
            onClick={handleAddTodo}
            className="bg-white text-indigo-600 p-3 rounded-r-full hover:bg-gray-100 transition duration-300"
          >
            Add
          </button>
        </div>

        {/* TODO LIST */}
        <ul>
          {todos.map((todo) => (
          <li
            key={todo.id}
            className="grid grid-cols-[1fr_140px_120px_40px] items-center bg-white bg-opacity-90 p-4 mb-4 rounded-lg shadow-lg"
          >
            {/* TITLE */}
            <span className="text-gray-800 font-medium">{todo.title}</span>

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
                  className="w-36 h-36 object-cover rounded"
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
                    isPastDue(new Date(todo.dueDate)) ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  Due: {new Date(todo.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* DELETE BUTTON */}
            <button
              onClick={() => handleDeleteTodo(todo.id)}
              className="text-red-500 hover:text-red-700 transition duration-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </li>
          ))}
        </ul>
      </div>
    </div>
  );
}