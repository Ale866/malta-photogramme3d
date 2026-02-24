<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

const emit = defineEmits<{
  move: [{ x: number; y: number }]
}>()

const rootEl = ref<HTMLElement | null>(null)
const baseEl = ref<HTMLElement | null>(null)
const knobOffset = ref({ x: 0, y: 0 })
const activePointerId = ref<number | null>(null)
const MAX_RADIUS_PX = 32

const knobStyle = computed(() => ({
  transform: `translate(${knobOffset.value.x}px, ${knobOffset.value.y}px)`,
}))

const isActive = computed(() => activePointerId.value !== null)

function emitMove(x: number, y: number) {
  emit('move', { x, y })
}

function resetJoystick() {
  activePointerId.value = null
  knobOffset.value = { x: 0, y: 0 }
  emitMove(0, 0)
}

function updateKnobFromPointer(clientX: number, clientY: number) {
  const base = baseEl.value
  if (!base) return

  const rect = base.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  let dx = clientX - centerX
  let dy = clientY - centerY

  const distance = Math.hypot(dx, dy)
  if (distance > MAX_RADIUS_PX) {
    const ratio = MAX_RADIUS_PX / distance
    dx *= ratio
    dy *= ratio
  }

  knobOffset.value = { x: dx, y: dy }
  emitMove(dx / MAX_RADIUS_PX, -dy / MAX_RADIUS_PX)
}

function onPointerDown(event: PointerEvent) {
  if (activePointerId.value !== null) return

  activePointerId.value = event.pointerId
  rootEl.value?.setPointerCapture(event.pointerId)
  updateKnobFromPointer(event.clientX, event.clientY)
  event.preventDefault()
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerId !== activePointerId.value) return

  updateKnobFromPointer(event.clientX, event.clientY)
  event.preventDefault()
}

function onPointerUp(event: PointerEvent) {
  if (event.pointerId !== activePointerId.value) return

  if (rootEl.value?.hasPointerCapture(event.pointerId)) {
    rootEl.value.releasePointerCapture(event.pointerId)
  }
  resetJoystick()
  event.preventDefault()
}

onBeforeUnmount(() => {
  resetJoystick()
})
</script>

<template>
  <div
    ref="rootEl"
    class="mobile-joystick"
    :data-active="isActive"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div ref="baseEl" class="mobile-joystick-base">
      <div class="mobile-joystick-knob" :style="knobStyle"></div>
    </div>
  </div>
</template>

<style scoped>
.mobile-joystick {
  width: 92px;
  height: 92px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.mobile-joystick-base {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgb(255 255 255 / 0.22);
  background: rgb(10 18 28 / 0.48);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgb(0 0 0 / 0.35);
}

.mobile-joystick-knob {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgb(255 255 255 / 0.28);
  background: linear-gradient(145deg, rgb(101 167 255 / 0.95), rgb(42 124 233 / 0.95));
  box-shadow: 0 8px 16px rgb(0 0 0 / 0.35);
  transition: transform 80ms linear;
}

.mobile-joystick[data-active='true'] .mobile-joystick-knob {
  transition: none;
}
</style>
