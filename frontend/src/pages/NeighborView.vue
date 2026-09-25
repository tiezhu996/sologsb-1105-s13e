<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSheetStore } from '../stores/sheetStore'
import {
  oppositeDirection,
  useSheetNeighbors,
  type NeighborDirection,
  type NeighborSlot,
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

function slotAt(direction: NeighborDirection): NeighborSlot | undefined {
  return status.value.slots.find((slot) => slot.direction === direction)
}

const slotGridClass: Record<NeighborDirection, string> = {
  东: 'slot-east',
  南: 'slot-south',
  西: 'slot-west',
  北: 'slot-north',
}

function slotClass(direction: NeighborDirection): string {
  const slot = slotAt(direction)
  const modifier =
    slot?.entry?.state === 'pending'
      ? 'neighbor-slot--pending'
      : slot?.entry?.state === 'missing'
        ? 'neighbor-slot--missing'
        : ''
  return ['neighbor-slot', slotGridClass[direction], modifier].filter(Boolean).join(' ')
}

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
        <p>按东、南、西、北排列相邻图幅，以主用扫描件核对接边，并明确尚缺图幅。</p>
      </div>
      <router-link :to="`/sheets/${source.id}`"><el-button>返回图幅详情</el-button></router-link>
    </div>

    <div class="metrics-strip">
      <div class="metric">
        <span>登记邻接图</span>
        <strong>{{ status.adjacentCount }}</strong><small>幅</small>
      </div>
      <div class="metric">
        <span>已对齐</span>
        <strong>{{ status.aligned.length }}</strong><small>幅</small>
      </div>
      <div class="metric">
        <span>待核</span>
        <strong data-testid="count-pending">{{ status.pending.length }}</strong><small>条</small>
      </div>
      <div class="metric">
        <span>缺编图幅</span>
        <strong>{{ status.missingCodes.length }}</strong><small>幅</small>
      </div>
    </div>

    <div class="neighbor-map">
      <article :class="slotClass('北')">
        <div class="neighbor-slot__heading">
          <span class="neighbor-slot__direction">北 · NORTH</span>
          <el-tag v-if="slotAt('北')?.entry?.state === 'pending'" type="danger" effect="dark" size="small">待核</el-tag>
          <el-tag v-else-if="slotAt('北')?.entry?.origin === 'inferred'" type="success" effect="plain" size="small">对方登记</el-tag>
          <el-tag v-else-if="slotAt('北')?.entry?.state === 'aligned'" type="success" effect="dark" size="small">已对齐</el-tag>
        </div>
        <template v-if="slotAt('北')?.entry">
          <template v-if="slotAt('北')?.entry?.sheet">
            <h3 :class="{ 'text-danger': slotAt('北')?.entry?.state === 'pending' }">{{ slotAt('北')?.entry?.code }}</h3>
            <p>{{ slotAt('北')?.entry?.sheet?.title }}</p>
            <p v-if="slotAt('北')?.entry?.conflictCode" class="text-danger">
              对方南邻已自填 {{ slotAt('北')?.entry?.conflictCode }}，依对方自填为准，本条待核。
            </p>
            <router-link :to="`/sheets/${slotAt('北')?.entry?.sheet?.id}`"><el-button link type="primary">查看图幅</el-button></router-link>
          </template>
          <template v-else>
            <h3 class="text-danger">{{ slotAt('北')?.entry?.code }}</h3>
            <p>馆藏缺编，需补图后再核接边。</p>
          </template>
        </template>
        <p v-else>该方向未登记邻接关系。</p>
        <p
          v-for="inbound in slotAt('北')?.inbound ?? []"
          :key="`inbound-north-${inbound.code}`"
          class="neighbor-slot__inbound"
        >
          {{ inbound.code }} 把本幅记为其{{ inbound.fromDirection }}邻，其登记待核。
        </p>
      </article>

      <article :class="slotClass('西')">
        <div class="neighbor-slot__heading">
          <span class="neighbor-slot__direction">西 · WEST</span>
          <el-tag v-if="slotAt('西')?.entry?.state === 'pending'" type="danger" effect="dark" size="small">待核</el-tag>
          <el-tag v-else-if="slotAt('西')?.entry?.origin === 'inferred'" type="success" effect="plain" size="small">对方登记</el-tag>
          <el-tag v-else-if="slotAt('西')?.entry?.state === 'aligned'" type="success" effect="dark" size="small">已对齐</el-tag>
        </div>
        <template v-if="slotAt('西')?.entry">
          <template v-if="slotAt('西')?.entry?.sheet">
            <h3 :class="{ 'text-danger': slotAt('西')?.entry?.state === 'pending' }">{{ slotAt('西')?.entry?.code }}</h3>
            <p>{{ slotAt('西')?.entry?.sheet?.title }}</p>
            <p v-if="slotAt('西')?.entry?.conflictCode" class="text-danger">
              对方东邻已自填 {{ slotAt('西')?.entry?.conflictCode }}，依对方自填为准，本条待核。
            </p>
            <router-link :to="`/sheets/${slotAt('西')?.entry?.sheet?.id}`"><el-button link type="primary">查看图幅</el-button></router-link>
          </template>
          <template v-else>
            <h3 class="text-danger">{{ slotAt('西')?.entry?.code }}</h3>
            <p>馆藏缺编，需补图后再核接边。</p>
          </template>
        </template>
        <p v-else>该方向未登记邻接关系。</p>
        <p
          v-for="inbound in slotAt('西')?.inbound ?? []"
          :key="`inbound-west-${inbound.code}`"
          class="neighbor-slot__inbound"
        >
          {{ inbound.code }} 把本幅记为其{{ inbound.fromDirection }}邻，其登记待核。
        </p>
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

      <article :class="slotClass('东')">
        <div class="neighbor-slot__heading">
          <span class="neighbor-slot__direction">东 · EAST</span>
          <el-tag v-if="slotAt('东')?.entry?.state === 'pending'" type="danger" effect="dark" size="small">待核</el-tag>
          <el-tag v-else-if="slotAt('东')?.entry?.origin === 'inferred'" type="success" effect="plain" size="small">对方登记</el-tag>
          <el-tag v-else-if="slotAt('东')?.entry?.state === 'aligned'" type="success" effect="dark" size="small">已对齐</el-tag>
        </div>
        <template v-if="slotAt('东')?.entry">
          <template v-if="slotAt('东')?.entry?.sheet">
            <h3 :class="{ 'text-danger': slotAt('东')?.entry?.state === 'pending' }">{{ slotAt('东')?.entry?.code }}</h3>
            <p>{{ slotAt('东')?.entry?.sheet?.title }}</p>
            <p v-if="slotAt('东')?.entry?.conflictCode" class="text-danger">
              对方西邻已自填 {{ slotAt('东')?.entry?.conflictCode }}，依对方自填为准，本条待核。
            </p>
            <router-link :to="`/sheets/${slotAt('东')?.entry?.sheet?.id}`"><el-button link type="primary">查看图幅</el-button></router-link>
          </template>
          <template v-else>
            <h3 class="text-danger">{{ slotAt('东')?.entry?.code }}</h3>
            <p>馆藏缺编，需补图后再核接边。</p>
          </template>
        </template>
        <p v-else>该方向未登记邻接关系。</p>
        <p
          v-for="inbound in slotAt('东')?.inbound ?? []"
          :key="`inbound-east-${inbound.code}`"
          class="neighbor-slot__inbound"
        >
          {{ inbound.code }} 把本幅记为其{{ inbound.fromDirection }}邻，其登记待核。
        </p>
      </article>

      <article :class="slotClass('南')">
        <div class="neighbor-slot__heading">
          <span class="neighbor-slot__direction">南 · SOUTH</span>
          <el-tag v-if="slotAt('南')?.entry?.state === 'pending'" type="danger" effect="dark" size="small">待核</el-tag>
          <el-tag v-else-if="slotAt('南')?.entry?.origin === 'inferred'" type="success" effect="plain" size="small">对方登记</el-tag>
          <el-tag v-else-if="slotAt('南')?.entry?.state === 'aligned'" type="success" effect="dark" size="small">已对齐</el-tag>
        </div>
        <template v-if="slotAt('南')?.entry">
          <template v-if="slotAt('南')?.entry?.sheet">
            <h3 :class="{ 'text-danger': slotAt('南')?.entry?.state === 'pending' }">{{ slotAt('南')?.entry?.code }}</h3>
            <p>{{ slotAt('南')?.entry?.sheet?.title }}</p>
            <p v-if="slotAt('南')?.entry?.conflictCode" class="text-danger">
              对方北邻已自填 {{ slotAt('南')?.entry?.conflictCode }}，依对方自填为准，本条待核。
            </p>
            <router-link :to="`/sheets/${slotAt('南')?.entry?.sheet?.id}`"><el-button link type="primary">查看图幅</el-button></router-link>
          </template>
          <template v-else>
            <h3 class="text-danger">{{ slotAt('南')?.entry?.code }}</h3>
            <p>馆藏缺编，需补图后再核接边。</p>
          </template>
        </template>
        <p v-else>该方向未登记邻接关系。</p>
        <p
          v-for="inbound in slotAt('南')?.inbound ?? []"
          :key="`inbound-south-${inbound.code}`"
          class="neighbor-slot__inbound"
        >
          {{ inbound.code }} 把本幅记为其{{ inbound.fromDirection }}邻，其登记待核。
        </p>
      </article>
    </div>

    <div v-if="status.aligned.length" class="section-title">
      <div>
        <h2>已对齐邻接</h2>
        <p class="muted">双方登记一致，或本幅暂缺、由对方登记补入的方向。</p>
        <ul class="neighbor-check-list neighbor-check-list--aligned">
          <li v-for="item in status.aligned" :key="`${item.direction}-${item.code}`">
            <el-tag size="small" type="success" effect="plain">{{ item.direction }}邻</el-tag>
            <strong>{{ item.code }}</strong>
            <span class="muted">{{ item.origin === 'inferred' ? '对方登记补入' : '双向一致或对方暂缺' }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="status.pending.length" class="section-title" data-testid="pending-section">
      <div>
        <h2 class="text-danger">待核邻接</h2>
        <p class="muted">对方反向已自填别的图号，依对方自填为准，本幅以下登记与已对齐的分开列，待人工核对。</p>
        <ul class="neighbor-check-list neighbor-check-list--pending">
          <li v-for="item in status.pending" :key="`${item.direction}-${item.code}`">
            <el-tag size="small" type="danger" effect="dark">待核 · {{ item.direction }}邻</el-tag>
            <strong>{{ item.code }}</strong>
            <span class="text-danger">对方{{ oppositeDirection(item.direction) }}邻已记 {{ item.conflictCode }}</span>
          </li>
        </ul>
      </div>
    </div>

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
