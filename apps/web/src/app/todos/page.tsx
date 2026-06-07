'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  ListTodo,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/trpc'

type Filter = 'all' | 'active' | 'completed'

function useTodos() {
  const todoQuery = useQuery(trpc.todo.getAll.queryOptions())
  const refetch = () => {
    void todoQuery.refetch()
  }

  const createTodo = useMutation(trpc.todo.create.mutationOptions({ onSuccess: refetch }))
  const toggleTodo = useMutation(trpc.todo.toggle.mutationOptions({ onSuccess: refetch }))
  const deleteTodo = useMutation(trpc.todo.delete.mutationOptions({ onSuccess: refetch }))

  const addTodo = (text: string) => {
    const value = text.trim()
    if (!value) {
      return
    }
    createTodo.mutate({ text: value })
  }

  const toggleTodoById = (id: number, completed: boolean) => {
    toggleTodo.mutate({ id, completed: !completed })
  }

  const deleteTodoById = (id: number) => {
    deleteTodo.mutate({ id })
  }

  return {
    todos: todoQuery.data ?? [],
    isLoading: todoQuery.isLoading,
    isCreating: createTodo.isPending,
    isMutating: createTodo.isPending || toggleTodo.isPending || deleteTodo.isPending,
    addTodo,
    toggleTodo: toggleTodoById,
    deleteTodo: deleteTodoById,
  }
}

function TodoSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl border border-border/40 bg-background/40 px-4 py-3.5"
        >
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="h-4 flex-1 rounded-md" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message, icon }: { message: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
        {icon}
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export default function TodosPage() {
  const { t } = useTranslation()
  const [newTodoText, setNewTodoText] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const { todos, isLoading, isCreating, isMutating, addTodo, toggleTodo, deleteTodo } = useTodos()

  const stats = useMemo(() => {
    const total = todos.length
    const completed = todos.filter((todo) => todo.completed).length
    const active = total - completed
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, active, progress }
  }, [todos])

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter((todo) => !todo.completed)
      case 'completed':
        return todos.filter((todo) => todo.completed)
      default:
        return todos
    }
  }, [todos, filter])

  const emptyMessage = useMemo(() => {
    if (todos.length === 0) {
      return t('No todos yet. Add one above!')
    }
    if (filter === 'active') {
      return t('All tasks completed!')
    }
    if (filter === 'completed') {
      return t('No completed tasks yet')
    }
    return t('No todos yet. Add one above!')
  }, [todos.length, filter, t])

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: t('All'), count: stats.total },
    { key: 'active', label: t('Active'), count: stats.active },
    { key: 'completed', label: t('Completed'), count: stats.completed },
  ]

  return (
    <div className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 size-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-24 size-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-600 shadow-sm dark:text-violet-400">
              <ListTodo className="size-6" />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium tracking-widest text-violet-600 uppercase dark:text-violet-400">
                {t('Tasks')}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">{t('Todo List')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('Manage your tasks efficiently')}
              </p>
            </div>
          </div>

          {stats.total > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('Total'), value: stats.total, accent: 'text-foreground' },
                {
                  label: t('Active'),
                  value: stats.active,
                  accent: 'text-sky-600 dark:text-sky-400',
                },
                {
                  label: t('Completed'),
                  value: stats.completed,
                  accent: 'text-emerald-600 dark:text-emerald-400',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border/50 bg-card/60 px-4 py-3 backdrop-blur-sm"
                >
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={cn('mt-0.5 text-2xl font-semibold tabular-nums', stat.accent)}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </header>

        <div className="overflow-hidden rounded-3xl border border-border/50 bg-card/70 shadow-xl backdrop-blur-md">
          {stats.total > 0 && (
            <div className="border-b border-border/50 px-5 pt-5 pb-4 sm:px-6">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('Progress')}</span>
                <span className="font-medium text-foreground tabular-nums">{stats.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="border-b border-border/50 p-3 sm:p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!newTodoText.trim()) {
                  return
                }
                addTodo(newTodoText)
                setNewTodoText('')
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Plus className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  placeholder={t('Add a new task...')}
                  disabled={isCreating}
                  className="h-11 rounded-xl border-border/60 bg-background/60 pr-4 pl-10 text-sm shadow-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={isCreating || !newTodoText.trim()}
                className="h-11 rounded-xl px-6 shadow-sm"
              >
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="size-4" />
                    {t('Add')}
                  </>
                )}
              </Button>
            </form>
          </div>

          <div className="flex gap-1 border-b border-border/50 p-2 sm:px-4">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all sm:text-sm',
                  filter === item.key
                    ? 'bg-violet-500/10 text-violet-700 shadow-sm dark:text-violet-300'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {item.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums sm:text-xs',
                    filter === item.key
                      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-3 sm:p-4">
            {isLoading ? (
              <TodoSkeleton />
            ) : filteredTodos.length === 0 ? (
              <EmptyState
                message={emptyMessage}
                icon={
                  todos.length === 0 ? (
                    <ClipboardList className="size-8" />
                  ) : filter === 'active' ? (
                    <Sparkles className="size-8" />
                  ) : (
                    <Circle className="size-8" />
                  )
                }
              />
            ) : (
              <ul className="space-y-2">
                {filteredTodos.map((todo) => (
                  <li
                    key={todo.id}
                    className={cn(
                      'group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-200',
                      todo.completed
                        ? 'border-border/30 bg-muted/30'
                        : 'border-border/50 bg-background/50 hover:border-violet-500/30 hover:bg-violet-500/5 hover:shadow-sm',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => toggleTodo(todo.id, todo.completed)}
                        id={`todo-${todo.id}`}
                        disabled={isMutating}
                        className="size-5 rounded-md border-2 data-checked:border-violet-500 data-checked:bg-violet-500 data-checked:text-white"
                      />
                      <label
                        htmlFor={`todo-${todo.id}`}
                        className={cn(
                          'min-w-0 flex-1 cursor-pointer text-sm leading-snug transition-all duration-200 sm:text-base',
                          todo.completed &&
                            'text-muted-foreground line-through decoration-muted-foreground/50',
                        )}
                      >
                        {todo.text}
                      </label>
                      {todo.completed && (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500 opacity-60" />
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteTodo(todo.id)}
                      aria-label={t('Delete todo')}
                      disabled={isMutating}
                      className="size-8 shrink-0 rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
