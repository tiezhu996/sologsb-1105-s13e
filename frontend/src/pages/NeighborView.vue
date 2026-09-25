<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSheetStore } from '../stores/sheetStore'
import {
  NEIGHBOR_DIRECTIONS,
  useSheetNeighbors,
  type NeighborDirection,
  type NeighborEntryState,
} from '../hooks/useSheetNeighbors'
import type { ScanItem } from '../types/scan'
import ScanCard from '../components/common/ScanCard.vue'
import ScaleTag from '../components/common/ScaleTag.vue'
import VacantHint from '../components/common/VacantHint.vue'

const route = useRoute()
const sheetStore = useSheetStore()
const sheetId = computed(() => String(route.params.id ?? ''))
const { status } = useSheetNeighbors(sheetId)
const source = computed(() => status.value.source)

const SLOT_CLASS: Record<NeighborDirection, string> = {
  east: 'slot-east',
  south: 'slot-south',
  west: 'slot-west',
  north: 'slot-north',
}

const ENTRY_STATE_META: Record<NeighborEntryState, { label: string; tag: 'success' | 'warning' | 'info' | 'danger' }> = {
  aligned: { label: '已对齐', tag: 'success' },
  pending: { label: '待核', tag: 'warning' },
  oneSided: { label: '单向登记', tag: 'info' },
  missing: { label: '缺编', tag: 'danger' },
  inferred: { label: '对方登记', tag: 'info' },
}

const slots = computed(() =>
  NEIGHBOR_DIRECTIONS.map((meta) => ({
    ...meta,
    entry: status.value.entries.find((entry) => entry.direction === meta.key),
  })),
)

function primaryScan(sheetIdToFind: string): ScanItem | undefined {
  return sheetStore.getScansForSheet(sheetIdToFind).find((scan) => scan.isPrimary)
}

const sourcePrimaryScan = computed(() => (source.value ? primaryScan(source.value.id) : undefined))

async function initialize(): Promise<void> {
  await sheetStore.init()
}

onMounted(() => {
  void initialize()
})
</script>

<template>
  <section v-if="source" class="page">
    <div class="page-heading">
      <div>
        <span class="page-kicker">NEIGHBOR ASSEMBLY</span>
        <h1>{{ source.code }} 邻接与拼合预览</h1>
        <p>按东、南、西、北四至排列相邻图幅，双向核对登记一致性；与邻幅自填冲突的条目单列待核。</p>
      </div>
      <router-link :to="`/sheets/${source.id}`"><el-button>返回图幅详情</el-button></router-link>
    </div>

    <div class="metrics-strip metrics-strip--four">
      <div class="metric">
        <span>登记邻接图</span>
        <strong>{{ status.adjacentCount }}</strong><small>幅</small>
      </div>
      <div class="metric">
        <span>已对齐</span>
        <strong>{{ status.alignedEntries.length }}</strong><small>幅</small>
      </div>
      <div class="metric">
        <span>待核</span>
        <strong>{{ status.pendingEntries.length }}</strong><small>条</small>
      </div>
      <div class="metric">
        <span>缺编图幅</span>
        <strong>{{ status.missingCodes.length }}</strong><small>幅</small>
      </div>
    </div>

    <div class="neighbor-map">
      <article
        v-for="slot in slots"
        :key="slot.key"
        class="neighbor-slot"
        :class="[
          SLOT_CLASS[slot.key],
          {
            'neighbor-slot--pending': slot.entry?.state === 'pending',
            'neighbor-slot--inferred': slot.entry?.state === 'inferred',
            'neighbor-slot--missing': slot.entry?.state === 'missing',
          },
        ]"
      >
        <span class="neighbor-slot__direction">{{ slot.label }} · {{ slot.english }}</span>
        <template v-if="slot.entry">
          <template v-if="slot.entry.sheet">
            <h3>{{ slot.entry.sheet.code }}</h3>
            <p>{{ slot.entry.sheet.title }}</p>
            <div class="neighbor-slot__tags">
              <el-tag :type="ENTRY_STATE_META[slot.entry.state].tag" size="small" effect="dark">
                {{ ENTRY_STATE_META[slot.entry.state].label }}
              </el-tag>
            </div>
            <p v-if="slot.entry.note" class="neighbor-slot__note">{{ slot.entry.note }}</p>
            <router-link :to="`/sheets/${slot.entry.sheet.id}`"><el-button link type="primary">查看图幅</el-button></router-link>
          </template>
          <template v-else>
            <h3 class="text-danger">{{ slot.entry.code }}</h3>
            <div class="neighbor-slot__tags">
              <el-tag type="danger" size="small" effect="dark">缺编</el-tag>
            </div>
            <p>馆藏缺编，需补图后再核接边。</p>
          </template>
        </template>
        <p v-else>该方向未登记邻接图。</p>
      </article>

      <article class="neighbor-slot neighbor-slot--center slot-center">
        <span class="neighbor-slot__direction">当前图幅 · CENTER</span>
        <h3>{{ source.code }}</h3>
        <p>{{ source.title }}</p>
        <ScaleTag :year="source.year" :scale="source.scale" />
        <div v-if="sourcePrimaryScan" class="mt-20">
          <ScanCard :scan="sourcePrimaryScan" />
        </div>
        <p v-else class="mt-20">尚未标记主用扫描件。</p>
      </article>
    </div>

    <template v-if="status.pendingEntries.length">
      <div class="section-title">
        <div>
          <h2>待核邻接</h2>
          <p class="muted">以下登记与邻幅自填的四至冲突，以邻幅自填为准，与已对齐条目分开列示。</p>
        </div>
      </div>
      <ul class="pending-list" data-testid="pending-neighbors">
        <li v-for="entry in status.pendingEntries" :key="entry.direction">
          <el-tag type="warning" size="small" effect="dark">待核</el-tag>
          <strong>{{ entry.directionLabel }}邻 {{ entry.code }}</strong>
          <span class="muted">{{ entry.note }}</span>
        </li>
      </ul>
    </template>

    <div v-if="status.missingCodes.length" class="section-title">
      <div>
        <h2>缺编提示</h2>
        <p class="muted">以下邻接图号尚未建立本地图幅卡：{{ status.missingCodes.join('、') }}</p>
      </div>
    </div>
  </section>

  <section v-else class="page">
    <h1>图幅邻接与拼合预览</h1>
    <VacantHint title="未找到该图幅" description="请返回图幅编目台重新选择记录。" />
  </section>
</template>
