import { ref } from 'vue'
import { pets, getPet, type PetDef } from '../pet/pets'

const currentPet = ref<PetDef>(pets[0])
let initialized = false

export function usePet() {
  if (!initialized) {
    initialized = true
    Promise.resolve().then(async () => {
      try {
        const id = await window.api.loadData<string>('pet')
        if (id) currentPet.value = getPet(id)
      } catch {
        // ignore
      }
    })
  }

  function setPet(id: string): void {
    currentPet.value = getPet(id)
    window.api.saveData('pet', id)
  }

  function nextPet(): void {
    const idx = pets.findIndex((p) => p.id === currentPet.value.id)
    const next = pets[(idx + 1) % pets.length]
    setPet(next.id)
  }

  return { currentPet, pets, setPet, nextPet }
}
