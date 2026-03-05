"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { trpc } from "@/utils/trpc";

function useTodos() {
  const todoQuery = useQuery(trpc.todo.getAll.queryOptions());
  const refetch = () => {
    void todoQuery.refetch();
  };

  const createTodo = useMutation(trpc.todo.create.mutationOptions({ onSuccess: refetch }));
  const toggleTodo = useMutation(trpc.todo.toggle.mutationOptions({ onSuccess: refetch }));
  const deleteTodo = useMutation(trpc.todo.delete.mutationOptions({ onSuccess: refetch }));

  const addTodo = (text: string) => {
    const value = text.trim();
    if (!value) {
      return;
    }
    createTodo.mutate({ text: value });
  };

  const toggleTodoById = (id: number, completed: boolean) => {
    toggleTodo.mutate({ id, completed: !completed });
  };

  const deleteTodoById = (id: number) => {
    deleteTodo.mutate({ id });
  };

  return {
    todos: todoQuery.data ?? [],
    isLoading: todoQuery.isLoading,
    isCreating: createTodo.isPending,
    isMutating: createTodo.isPending || toggleTodo.isPending || deleteTodo.isPending,
    addTodo,
    toggleTodo: toggleTodoById,
    deleteTodo: deleteTodoById,
  };
}

export default function TodosPage() {
  const [newTodoText, setNewTodoText] = useState("");
  const { todos, isLoading, isCreating, isMutating, addTodo, toggleTodo, deleteTodo } = useTodos();

  return (
    <div className="mx-auto w-full max-w-3xl py-10 px-4 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Todo List</CardTitle>
          <CardDescription className="text-base">Manage your tasks efficiently</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTodoText.trim()) {
                return;
              }
              addTodo(newTodoText);
              setNewTodoText("");
            }}
            className="mb-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <Input
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add a new task..."
              disabled={isCreating}
              className="text-base py-6"
            />
            <Button type="submit" disabled={isCreating || !newTodoText.trim()} className="px-8 py-6 text-base">
              {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Add"}
            </Button>
          </form>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : todos.length === 0 ? (
            <p className="py-12 text-center text-lg text-muted-foreground">
              No todos yet. Add one above!
            </p>
          ) : (
            <ul className="space-y-3">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Checkbox
                      checked={todo.completed}
                      onCheckedChange={() => toggleTodo(todo.id, todo.completed)}
                      id={`todo-${todo.id}`}
                      disabled={isMutating}
                      className="h-5 w-5"
                    />
                    <label
                      htmlFor={`todo-${todo.id}`}
                      className={`text-base cursor-pointer flex-1 ${
                        todo.completed ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {todo.text}
                    </label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTodo(todo.id)}
                    aria-label="Delete todo"
                    disabled={isMutating}
                    className="h-10 w-10"
                  >
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
