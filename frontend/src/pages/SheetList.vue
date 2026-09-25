<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useSheetStore, type NewSheet } from '../stores/sheetStore'
import type { Sheet, SheetScale, SheetStatus } from '../types/sheet'
import { SHEET_SCALES, SHEET_STATUSES } from '../types/sheet'
import { oppositeDirection, useSheetNeighbors, type NeighborEntry } from '../hooks/useSheetNeighbors'
import { scaleToText } from '../utils/scale'
import ScaleTag from '../components/common/ScaleTag.vue'
import VacantHint from '../components/common/VacantHint.vue'

const sheetStore = useSheetStore()
const { getNeighborStatus } = useSheetNeighbors('')

const yearFilter = ref('全部')
const scaleFilter = ref<SheetScale | '全部'>('全部')
const statusFilter = ref<SheetStatus | '全部'>('全部')
const showCreateForm = ref(false)
const formError = ref('')

function createEmptyForm(): NewSheet {
  return {
    code: '',
    title: '',
    year: 1935,
    scale: '1:5000',
    projection: '三角测量 · 平面图',
    sheetSizeCm: '58 × 46 厘米',
    series: '新编图组',
    neighbors: { 东: '', 南: '', 西: '', 北: '' },
    status: '待编',
  }
}

const form = reactive<NewSheet>(createEmptyForm())

const years = computed(() => [...new Set(sheetStore.sheets.map((sheet) => sheet.year))].sort((a, b) => b - a))

const filteredSheets = computed(() =>
  sheetStore.sheets.filter((sheet) => {
    const matchesYear = yearFilter.value === '全部' || String(sheet.year) === yearFilter.value
    const matchesScale = scaleFilter.value === '全部' || sheet.scale === scaleFilter.value
    const matchesStatus = statusFilter.value === '全部' || sheet.status === statusFilter.value
    return matchesYear && matchesScale && matchesStatus
  }),
)

interface SheetNeighborSummary {
  adjacentCount: number
  alignedCount: number
  pending: NeighborEntry[]
  missingCodes: string[]
}

function neighborSummary(sheet: Sheet): SheetNeighborSummary {
  const neighborStatus = getNeighborStatus(sheet.id)
  return {
    adjacentCount: neighborStatus.adjacentCount,
    alignedCount: neighborStatus.aligned.length,
    pending: neighborStatus.pending,
    missingCodes: neighborStatus.missingCodes,
  }
}

function resetForm(): void {
  Object.assign(form, createEmptyForm())
  formError.value = ''
}

async function submitSheet(): Promise<void> {
  if (!form.code.trim() || !form.title.trim() || !form.year || !form.projection.trim()) {
    formError.value = '请填写图幅号、题名、年代与投影方式。'
    return
  }
  await sheetStore.addSheet({
    ...form,
    code: form.code.trim(),
    title: form.title.trim(),
    projection: form.projection.trim(),
    series: form.series.trim() || '未分组',
    neighbors: {
      东: form.neighbors.东.trim(),
      南: form.neighbors.南.trim(),
      西: form.neighbors.西.trim(),
      北: form.neighbors.北.trim(),
    },
  })
  resetForm()
  showCreateForm.value = false
}

onMounted(() => {
  void sheetStore.init()
})
</script>

<template>
  <section class="page">
    <div class="page-heading">
      <div>
        <span class="page-kicker">SHEET CATALOGUE</span>
        <h1>图幅编目台</h1>
        <p>按测绘年代、比例尺与整理状态核点图幅，快速查看对照片目、地名数量及邻接缺编情况。</p>
      </div>
      <el-button type="primary" size="large" data-testid="new-sheet" @click="showCreateForm = true">
        新建图幅
      </el-button>
    </div>

    <div class="metrics-strip">
      <div class="metric">
        <span>馆藏图幅</span>
        <strong>{{ sheetStore.sheets.length }}</strong><small>幅</small>
      </div>
      <div class="metric">
        <span>扫描条目</span>
        <strong>{{ sheetStore.allScans.length }}</strong><small>件</small>
      </div>
      <div class="metric">
        <span>已编图幅</span>
        <strong>{{ sheetStore.sheets.filter((sheet) => sheet.status === '已编').length }}</strong><small>幅</small>
      </div>
    </div>

    <form v-if="showCreateForm" class="inline-form" data-testid="form-sheet" @submit.prevent="submitSheet">
      <h2>新建图幅卡</h2>
      <div class="form-grid">
        <el-form-item label="图幅号" required>
          <input v-model="form.code" class="native-field" data-testid="field-code" placeholder="例如：北平-丁-1" />
        </el-form-item>
        <el-form-item label="图幅题名" required>
          <input v-model="form.title" class="native-field" data-testid="field-title" placeholder="填写图上主要地名或区域" />
        </el-form-item>
        <el-form-item label="测绘年代" required>
          <input v-model.number="form.year" class="native-field" data-testid="field-year" type="number" min="1800" max="2100" />
        </el-form-item>
        <el-form-item label="比例尺" required>
          <select v-model="form.scale" class="native-field" data-testid="field-scale">
            <option v-for="scale in SHEET_SCALES" :key="scale" :value="scale">{{ scale }}</option>
          </select>
        </el-form-item>
        <el-form-item label="投影方式" required>
          <input v-model="form.projection" class="native-field" data-testid="field-projection" />
        </el-form-item>
        <el-form-item label="所属图组" required>
          <input v-model="form.series" class="native-field" data-testid="field-series" />
        </el-form-item>
        <el-form-item label="整理状态" required>
          <select v-model="form.status" class="native-field" data-testid="field-status">
            <option v-for="status in SHEET_STATUSES" :key="status" :value="status">{{ status }}</option>
          </select>
        </el-form-item>
        <el-form-item label="图幅尺寸">
          <input v-model="form.sheetSizeCm" class="native-field" placeholder="例如：58 × 46 厘米" />
        </el-form-item>
        <el-form-item label="四至邻接（东）">
          <input
            v-model="form.neighbors.东"
            class="native-field"
            data-testid="field-neighbor-east"
            placeholder="东邻图号，暂缺留空"
          />
        </el-form-item>
        <el-form-item label="四至邻接（南）">
          <input
            v-model="form.neighbors.南"
            class="native-field"
            data-testid="field-neighbor-south"
            placeholder="南邻图号，暂缺留空"
          />
        </el-form-item>
        <el-form-item label="四至邻接（西）">
          <input
            v-model="form.neighbors.西"
            class="native-field"
            data-testid="field-neighbor-west"
            placeholder="西邻图号，暂缺留空"
          />
        </el-form-item>
        <el-form-item label="四至邻接（北）">
          <input
            v-model="form.neighbors.北"
            class="native-field"
            data-testid="field-neighbor-north"
            placeholder="北邻图号，暂缺留空"
          />
        </el-form-item>
        <div class="form-actions">
          <el-button @click="showCreateForm = false; resetForm()">取消</el-button>
          <el-button type="primary" native-type="submit" data-testid="submit-sheet">保存图幅</el-button>
        </div>
      </div>
      <p v-if="formError" class="text-danger">{{ formError }}</p>
    </form>

    <div class="filter-bar">
      <span class="muted">筛选：</span>
      <el-select v-model="yearFilter" style="width: 130px" aria-label="按年代筛选">
        <el-option label="全部年代" value="全部" />
        <el-option v-for="year in years" :key="year" :label="`${year} 年`" :value="String(year)" />
      </el-select>
      <el-select v-model="scaleFilter" style="width: 140px" aria-label="按比例尺筛选">
        <el-option label="全部比例尺" value="全部" />
        <el-option v-for="scale in SHEET_SCALES" :key="scale" :label="scale" :value="scale" />
      </el-select>
      <el-select v-model="statusFilter" style="width: 130px" aria-label="按整理状态筛选">
        <el-option label="全部状态" value="全部" />
        <el-option v-for="status in SHEET_STATUSES" :key="status" :label="status" :value="status" />
      </el-select>
      <span class="filter-count">当前记录数：<strong data-testid="count-sheet">{{ filteredSheets.length }}</strong></span>
    </div>

    <div v-if="filteredSheets.length" class="card-grid">
      <article v-for="sheet in filteredSheets" :key="sheet.id" class="sheet-card" data-testid="row-sheet">
        <div class="sheet-card__top">
          <div>
            <div class="sheet-card__code">{{ sheet.code }}</div>
            <div class="sheet-card__series">{{ sheet.series }}</div>
          </div>
          <el-tag :type="sheet.status === '已编' ? 'success' : sheet.status === '待核' ? 'warning' : 'info'" effect="dark">
            {{ sheet.status }}
          </el-tag>
        </div>

        <h2>{{ sheet.title }}</h2>
        <ScaleTag :year="sheet.year" :scale="sheet.scale" />

        <div class="sheet-card__meta">
          <div><span>投影</span><br /><strong>{{ sheet.projection }}</strong></div>
          <div><span>图幅尺寸</span><br /><strong>{{ sheet.sheetSizeCm }}</strong></div>
          <div><span>对照片目</span><br /><strong>{{ sheetStore.getScansForSheet(sheet.id).length }} 件</strong></div>
          <div><span>比例尺说明</span><br /><strong>{{ scaleToText(sheet.scale) }}</strong></div>
        </div>

        <div class="neighbor-note mt-20">
          <strong>四至核点：</strong>
          <template v-if="neighborSummary(sheet).adjacentCount === 0">尚未登记邻接图</template>
          <template v-else>
            <span>已对齐 {{ neighborSummary(sheet).alignedCount }} 幅</span>
            <el-tag
              v-for="item in neighborSummary(sheet).pending"
              :key="`${item.direction}-${item.code}`"
              class="neighbor-note__tag"
              type="danger"
              effect="plain"
              size="small"
              data-testid="pending-neighbor"
            >
              待核 · {{ item.direction }}邻 {{ item.code }}
              <template v-if="item.conflictCode">（对方{{ oppositeDirection(item.direction) }}邻已记 {{ item.conflictCode }}）</template>
            </el-tag>
            <el-tag
              v-for="code in neighborSummary(sheet).missingCodes"
              :key="code"
              class="neighbor-note__tag"
              type="warning"
              effect="plain"
              size="small"
            >
              缺编 {{ code }}
            </el-tag>
          </template>
        </div>

        <div class="status-row">
          <span class="muted">{{ sheet.projection }}</span>
          <div>
            <router-link :to="`/sheets/${sheet.id}`"><el-button link type="primary">查看图幅</el-button></router-link>
            <router-link :to="`/sheets/${sheet.id}/neighbors`"><el-button link>邻接预览</el-button></router-link>
          </div>
        </div>
      </article>
    </div>

    <VacantHint
      v-else
      title="没有符合条件的图幅"
      description="调整年代、比例尺或整理状态，或者新建一张图幅卡继续编目。"
      action-text="新建图幅"
      @action="showCreateForm = true"
    />
  </section>
</template>
