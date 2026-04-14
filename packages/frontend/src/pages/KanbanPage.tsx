import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Badge, Box, Button, Flex, Heading, HStack, Input,
  IconButton, NativeSelect, Spinner, Text, Textarea, VStack,
} from '@chakra-ui/react'
import { FaTrash } from 'react-icons/fa6'
import { useAuth } from '../context/AuthContext'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'
import { encrypt, decrypt } from '../lib/crypto'
import type { Task, KanbanColumn } from '@hydra/shared'

// ─── Spalten-Konfiguration ────────────────────────────────────────────────────

const COLUMNS: { id: KanbanColumn; label: string; color: string }[] = [
  { id: 'todo',       label: 'Aufgaben',       color: 'gray'   },
  { id: 'inProgress', label: 'In Bearbeitung',  color: 'blue'   },
  { id: 'inReview',   label: 'In Review',       color: 'orange' },
  { id: 'done',       label: 'Abgeschlossen',   color: 'green'  },
]

type UserOption = { id: string; name: string }
type RawRecord  = { id: string; encryptedData: string }

function decryptTask(raw: RawRecord, vaultKey: Uint8Array): Task {
  const data = JSON.parse(decrypt(raw.encryptedData, vaultKey))
  return { id: raw.id, ...data }
}

// ─── Task-Karte ───────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onMove,
  onDelete,
  onAssign,
  users,
  isDragging = false,
}: {
  task: Task
  onMove: (task: Task, col: KanbanColumn) => void
  onDelete: (id: string) => void
  onAssign: (task: Task, userId: string, userName: string) => void
  users: UserOption[]
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const { userId, role } = useAuth()
  const isAdmin = role === 'ADMIN'
  const colIndex = COLUMNS.findIndex(c => c.id === task.column)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  function handleAssignChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (val === '') {
      onAssign(task, '', '')
    } else {
      const user = users.find(u => u.id === val)
      if (user) onAssign(task, user.id, user.name)
    }
  }

  function handleAssignSelf() {
    const me = users.find(u => u.id === userId)
    if (!me) return
    if (task.assigneeId === userId) {
      onAssign(task, '', '')
    } else {
      onAssign(task, me.id, me.name)
    }
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      bg="white"
      rounded="md"
      shadow="sm"
      p={3}
      borderLeft="3px solid"
      borderColor={`${COLUMNS[colIndex]?.color ?? 'gray'}.300`}
    >
      {/* Drag-Handle */}
      <Box {...attributes} {...listeners} cursor="grab" _active={{ cursor: 'grabbing' }}>
        <HStack justify="space-between" mb={1}>
          <Text fontWeight="medium" fontSize="sm">{task.title}</Text>
          {task.category && (
            <Badge size="xs" variant="outline" colorPalette="purple" flexShrink={0}>
              {task.category}
            </Badge>
          )}
        </HStack>
        {task.description && (
          <Text fontSize="xs" color="gray.500" mb={2} whiteSpace="pre-wrap">
            {task.description}
          </Text>
        )}
        {task.deadline && (
          <Text fontSize="xs" color="orange.600" mb={1}>
            Fällig: {new Date(task.deadline).toLocaleDateString('de-DE')}
          </Text>
        )}
      </Box>

      {/* Zuweisung */}
      <Box mt={2}>
        {isAdmin && users.length > 0 ? (
          <NativeSelect.Root size="xs">
            <NativeSelect.Field
              value={task.assigneeId ?? ''}
              onChange={handleAssignChange}
              fontSize="xs"
            >
              <option value="">Nicht zugewiesen</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        ) : (
          <Button
            size="xs"
            variant={task.assigneeId === userId ? 'solid' : 'outline'}
            colorPalette={task.assigneeId === userId ? 'blue' : 'gray'}
            onClick={handleAssignSelf}
          >
            {task.assigneeName ?? 'Mir zuweisen'}
          </Button>
        )}
      </Box>

      {/* Navigation + Löschen */}
      <HStack justify="space-between" mt={2}>
        <HStack gap={1}>
          {colIndex > 0 && (
            <Button size="xs" variant="ghost" px={1} onClick={() => onMove(task, COLUMNS[colIndex - 1].id)}>←</Button>
          )}
          {colIndex < COLUMNS.length - 1 && (
            <Button size="xs" variant="ghost" px={1} onClick={() => onMove(task, COLUMNS[colIndex + 1].id)}>→</Button>
          )}
        </HStack>
        <IconButton size="xs" variant="ghost" colorPalette="red" aria-label="Löschen" onClick={() => onDelete(task.id)}>
          <FaTrash />
        </IconButton>
      </HStack>
    </Box>
  )
}

// ─── Spalte ───────────────────────────────────────────────────────────────────

function KanbanColumnView({
  column, tasks, onMove, onDelete, onAssign, users, activeId,
}: {
  column: typeof COLUMNS[number]
  tasks: Task[]
  onMove: (task: Task, col: KanbanColumn) => void
  onDelete: (id: string) => void
  onAssign: (task: Task, userId: string, userName: string) => void
  users: UserOption[]
  activeId: string | null
}) {
  return (
    <Box flex={1} minW="230px" maxW="320px">
      <HStack mb={3}>
        <Badge colorPalette={column.color} size="md">{column.label}</Badge>
        <Text fontSize="xs" color="gray.400">{tasks.length}</Text>
      </HStack>
      <Box bg="gray.100" rounded="lg" p={2} minH="200px">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <VStack gap={2} align="stretch">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onMove={onMove}
                onDelete={onDelete}
                onAssign={onAssign}
                users={users}
                isDragging={activeId === task.id}
              />
            ))}
          </VStack>
        </SortableContext>
      </Box>
    </Box>
  )
}

// ─── Neue Aufgabe erstellen ───────────────────────────────────────────────────

function AddTaskForm({
  categories,
  onAdd,
}: {
  categories: string[]
  onAdd: (title: string, description: string, deadline: string, category: string) => Promise<void>
}) {
  const [open, setOpen]             = useState(false)
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline]     = useState('')
  const [category, setCategory]     = useState('')
  const [customCat, setCustomCat]   = useState('')
  const [loading, setLoading]       = useState(false)

  async function submit() {
    if (!title.trim()) return
    const finalCat = category === '__new__' ? customCat.trim() : category
    setLoading(true)
    try {
      await onAdd(title.trim(), description.trim(), deadline, finalCat)
      setTitle(''); setDescription(''); setDeadline(''); setCategory(''); setCustomCat('')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return <Button size="sm" onClick={() => setOpen(true)}>+ Neue Aufgabe</Button>

  return (
    <Box bg="white" p={4} rounded="lg" shadow="sm" w="320px">
      <VStack gap={2} align="stretch">
        <Input placeholder="Titel" value={title} onChange={e => setTitle(e.target.value)} size="sm" autoFocus />
        <Textarea placeholder="Beschreibung (optional)" value={description} onChange={e => setDescription(e.target.value)} size="sm" rows={3} />
        <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} size="sm" />

        {/* Kategorie */}
        <NativeSelect.Root size="sm">
          <NativeSelect.Field value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Keine Kategorie</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__new__">+ Neue Kategorie…</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>

        {category === '__new__' && (
          <Input placeholder="Kategoriename" value={customCat} onChange={e => setCustomCat(e.target.value)} size="sm" />
        )}

        <HStack>
          <Button size="sm" onClick={submit} loading={loading} flex={1}>Erstellen</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
        </HStack>
      </VStack>
    </Box>
  )
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function KanbanPage() {
  const { token, vaultKey, role } = useAuth()
  const isAdmin = role === 'ADMIN'

  const [tasks, setTasks]     = useState<Task[]>([])
  const [users, setUsers]     = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('')
  const [mobileCol, setMobileCol] = useState<KanbanColumn>('todo') // '' = alle

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ─── Laden ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token || !vaultKey) return
    const loadTasks = apiGet<RawRecord[]>('/tasks', token)
      .then(recs => setTasks(recs.map(r => decryptTask(r, vaultKey))))

    const loadUsers = isAdmin
      ? apiGet<UserOption[]>('/users', token).then(setUsers).catch(() => {})
      : Promise.resolve()

    Promise.all([loadTasks, loadUsers]).finally(() => setLoading(false))
  }, [token, vaultKey, isAdmin])

  // ─── Abgeleitete Werte ─────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const cats = tasks.map(t => t.category).filter(Boolean) as string[]
    return [...new Set(cats)].sort()
  }, [tasks])

  const visibleTasks = useMemo(() =>
    filterCat ? tasks.filter(t => t.category === filterCat) : tasks,
    [tasks, filterCat]
  )

  // ─── Hilfsfunktion: Task speichern ─────────────────────────────────────────

  async function saveTask(updated: Task) {
    if (!token || !vaultKey) return
    const { id, ...payload } = updated
    const encryptedData = encrypt(JSON.stringify(payload), vaultKey)
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
    await apiPut<RawRecord>(`/tasks/${id}`, { encryptedData }, token)
  }

  // ─── Erstellen ─────────────────────────────────────────────────────────────

  const handleAdd = useCallback(async (title: string, description: string, deadline: string, category: string) => {
    if (!token || !vaultKey) return
    const payload: Omit<Task, 'id'> = {
      title,
      description: description || undefined,
      deadline: deadline || undefined,
      category: category || undefined,
      column: 'todo',
    }
    const encryptedData = encrypt(JSON.stringify(payload), vaultKey)
    const raw = await apiPost<RawRecord>('/tasks', { encryptedData }, token)
    setTasks(prev => [...prev, decryptTask(raw, vaultKey)])
  }, [token, vaultKey])

  // ─── Verschieben ───────────────────────────────────────────────────────────

  const handleMove = useCallback(async (task: Task, col: KanbanColumn) => {
    await saveTask({ ...task, column: col })
  }, [token, vaultKey])

  // ─── Zuweisung ─────────────────────────────────────────────────────────────

  const handleAssign = useCallback(async (task: Task, assigneeId: string, assigneeName: string) => {
    await saveTask({
      ...task,
      assigneeId:   assigneeId   || undefined,
      assigneeName: assigneeName || undefined,
    })
  }, [token, vaultKey])

  // ─── Löschen ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (id: string) => {
    if (!token) return
    setTasks(prev => prev.filter(t => t.id !== id))
    await apiDelete(`/tasks/${id}`, token)
  }, [token])

  // ─── Drag & Drop ───────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const targetTask  = tasks.find(t => t.id === over.id)
    const targetColId = targetTask
      ? targetTask.column
      : COLUMNS.find(c => c.id === over.id)?.id

    if (!targetColId) return
    const draggedTask = tasks.find(t => t.id === active.id)
    if (!draggedTask || draggedTask.column === targetColId) return
    await handleMove(draggedTask, targetColId)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return <Spinner />

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading>Aufgaben</Heading>
        <AddTaskForm categories={categories} onAdd={handleAdd} />
      </Flex>

      {/* Filter-Leiste */}
      {categories.length > 0 && (
        <HStack mb={4} flexWrap="wrap" gap={2}>
          <Button size="xs" variant={filterCat === '' ? 'solid' : 'outline'} onClick={() => setFilterCat('')}>
            Alle
          </Button>
          {categories.map(cat => (
            <Button
              key={cat} size="xs" colorPalette="purple"
              variant={filterCat === cat ? 'solid' : 'outline'}
              onClick={() => setFilterCat(cat === filterCat ? '' : cat)}
            >
              {cat}
            </Button>
          ))}
        </HStack>
      )}

      {/* ── Mobile: Tab-Leiste + eine Spalte ──────────────────────── */}
      <Box display={{ base: 'block', md: 'none' }}>
        <HStack mb={3} gap={0} borderBottom="1px solid" borderColor="gray.200" overflowX="auto">
          {COLUMNS.map(col => (
            <Button
              key={col.id}
              size="sm"
              variant="ghost"
              borderBottom="2px solid"
              borderColor={mobileCol === col.id ? `${col.color}.500` : 'transparent'}
              borderRadius={0}
              flexShrink={0}
              color={mobileCol === col.id ? `${col.color}.600` : 'gray.500'}
              fontWeight={mobileCol === col.id ? 'semibold' : 'normal'}
              onClick={() => setMobileCol(col.id)}
            >
              {col.label}
              <Text as="span" ml={1} fontSize="xs" color="gray.400">
                {visibleTasks.filter(t => t.column === col.id).length}
              </Text>
            </Button>
          ))}
        </HStack>
        {COLUMNS.filter(col => col.id === mobileCol).map(col => (
          <KanbanColumnView
            key={col.id}
            column={col}
            tasks={visibleTasks.filter(t => t.column === col.id)}
            onMove={handleMove}
            onDelete={handleDelete}
            onAssign={handleAssign}
            users={users}
            activeId={activeId}
          />
        ))}
      </Box>

      {/* ── Desktop: alle Spalten nebeneinander ───────────────────── */}
      <Box display={{ base: 'none', md: 'block' }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Flex gap={4} align="flex-start" overflowX="auto" pb={4}>
          {COLUMNS.map(col => (
            <KanbanColumnView
              key={col.id}
              column={col}
              tasks={visibleTasks.filter(t => t.column === col.id)}
              onMove={handleMove}
              onDelete={handleDelete}
              onAssign={handleAssign}
              users={users}
              activeId={activeId}
            />
          ))}
        </Flex>

        <DragOverlay>
          {activeTask && (
            <Box bg="white" rounded="md" shadow="lg" p={3} opacity={0.9} w="280px">
              <Text fontWeight="medium" fontSize="sm">{activeTask.title}</Text>
              {activeTask.description && (
                <Text fontSize="xs" color="gray.500" mt={1}>{activeTask.description}</Text>
              )}
            </Box>
          )}
        </DragOverlay>
      </DndContext>
      </Box>

    </Box>
  )
}
