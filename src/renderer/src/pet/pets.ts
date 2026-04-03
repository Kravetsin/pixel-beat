export interface PetDef {
  id: string
  name: string
}

export const pets: PetDef[] = [
  { id: 'cat', name: 'Cat' },
  { id: 'ghost', name: 'Jellyfish' },
  { id: 'claude', name: 'Robot' }
]

export function getPet(id: string): PetDef {
  return pets.find((p) => p.id === id) || pets[0]
}
