import { useState } from 'react'
import {
  Button, Dialog, Field, Input, Portal, Text, Stack,
} from '@chakra-ui/react'
import { IoSettingsOutline } from 'react-icons/io5'
import type { AppSettings } from '@hydra/shared'
import { useData } from '../context/DataContext'

export default function SettingsModal() {
  const { data, create, update } = useData()
  const [open, setOpen] = useState(false)
  const [memberCount, setMemberCount] = useState('')
  const [loading, setLoading] = useState(false)

  function handleOpen() {
    setMemberCount(String(data.settings?.memberCount ?? 16))
    setOpen(true)
  }

  async function save() {
    const count = parseInt(memberCount)
    if (!count || count < 1) return
    setLoading(true)
    try {
      if (data.settings) {
        await update<AppSettings>('appSettings', { ...data.settings, memberCount: count })
      } else {
        await create<AppSettings>('appSettings', { memberCount: count })
      }
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        color="gray.400"
        size="sm"
        onClick={handleOpen}
        aria-label="Einstellungen"
      >
        <IoSettingsOutline size={16} />
      </Button>

      <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Einstellungen</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Stack gap={4}>
                  <Field.Root>
                    <Field.Label>Mitgliederanzahl</Field.Label>
                    <Input
                      type="number"
                      value={memberCount}
                      onChange={(e) => setMemberCount(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && save()}
                      min={1}
                      autoFocus
                    />
                    <Field.HelperText>
                      Wird für den "Wert pro Person" auf der Übersicht verwendet.
                    </Field.HelperText>
                  </Field.Root>
                </Stack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
                <Button onClick={save} loading={loading}>Speichern</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
