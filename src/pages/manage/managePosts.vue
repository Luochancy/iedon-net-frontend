<script setup lang="ts">
import { onMounted, Ref, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { loggedIn, nullOrEmpty, formatDate, showSnackbar } from '../../common/helper'
import { makeRequest, PostMetadaResponse, PostMetadata, PostResponse } from '../../common/packetHandler'

const t = useI18n().t
const router = useRouter()

const loading = ref(false)

const posts: Ref<PostMetadata[]> = ref([])
const fetchPosts = async () => {
    try {
        loading.value = true
        const resp = await makeRequest(t, '/list/posts')
        if (resp.success && resp.response) {
            const data = resp.response as PostMetadaResponse
            if (data && Array.isArray(data.posts)) {
                posts.value = data.posts
            }
        }
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    if (!loggedIn.value) {
        showSnackbar(t('pages.nodes.pleaseSignIn'), 'info')
        router.replace({ path: '/signin' })
        return
    }
    await fetchPosts()
})

const headers = ref([
    { title: t('pages.manage.posts.title'), key: 'title', sortable: true },
    { title: t('pages.manage.posts.category'), key: 'category', sortable: true },
    { title: t('pages.manage.posts.createdAt'), key: 'createdAt', sortable: true },
    { title: t('pages.manage.posts.updatedAt'), key: 'updatedAt', sortable: true },
    { title: t('pages.manage.session.action'), key: 'action', sortable: false },
])

const view = (record: PostMetadata) => {
    window.open(`/post/${record.postId}`)
}

const remove = async (record: PostMetadata) => {
    try {
        loading.value = true
        await makeRequest(t, '/admin', {
            action: 'deletePost',
            postId: record.postId
        })
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
        fetchPosts()
    }
}

const modalVisible = ref(false)
const modalLoading = ref(false)
const confirmDeleteVisible = ref(false)
const recordToDelete: Ref<PostMetadata | null> = ref(null)
const modalForm = ref({
    category: '',
    title: '',
    content: '',
    postId: -1,
})

const addOrEdit = async () => {
    if (nullOrEmpty(modalForm.value.category) || nullOrEmpty(modalForm.value.title) || nullOrEmpty(modalForm.value.content)) {
        showSnackbar(t('pages.peering.inputValid'), 'error')
        return
    }
    try {
        loading.value = true
        modalLoading.value = true
        const data: any = {
            action: 'setPost',
            type: modalForm.value.postId !== -1 ? 'update' : 'add',
            category: modalForm.value.category,
            title: modalForm.value.title,
            content: modalForm.value.content
        }
        if (modalForm.value.postId !== -1) Object.assign(data, { postId: modalForm.value.postId })
        await makeRequest(t, '/admin', data)
    } catch (error) {
        console.error(error)
    } finally {
        loading.value = false
        modalLoading.value = false
        modalVisible.value = false
        fetchPosts()
    }
}

const showAddOrEdit = async (record?: PostMetadata) => {
    modalVisible.value = true
    if (!record) {
        modalForm.value.category = ''
        modalForm.value.title = ''
        modalForm.value.content = ''
        modalForm.value.postId = -1
    } else {
        modalForm.value.category = record.category
        modalForm.value.title = record.title
        modalForm.value.postId = record.postId
        modalForm.value.content = ''
        try {
            modalLoading.value = true
            const resp = await makeRequest(t, `/list/post/${record.postId}`)
            if (resp.success && resp.response) {
                const data = resp.response as PostResponse
                if (data && data.content) modalForm.value.content = data.content
            }
        } catch (error) {
            showSnackbar(t('pages.signIn.errorOccurred'), 'error')
            console.error(error)
            return
        } finally {
            modalLoading.value = false
        }
    }
}

const confirmRemove = (record: PostMetadata) => {
    recordToDelete.value = record
    confirmDeleteVisible.value = true
}

const doRemove = async () => {
    if (recordToDelete.value) {
        await remove(recordToDelete.value)
    }
    confirmDeleteVisible.value = false
    recordToDelete.value = null
}
</script>

<template>
    <div class="manage-posts-wrapper">
        <div class="toolbar-row">
            <v-btn @click="showAddOrEdit()" color="primary" variant="flat" rounded="xl">
                <v-icon start>mdi-file-plus</v-icon>
                {{ t('pages.manage.posts.add') }}
            </v-btn>
        </div>
        <v-progress-linear v-if="loading" indeterminate color="primary" />
        <v-data-table
            :headers="headers"
            :items="posts"
            :loading="loading"
            density="comfortable"
            hover
            rounded="lg"
            :items-per-page="-1"
            class="md3-table"
        >
            <template #item.createdAt="{ item }">
                <span>{{ formatDate(item.createdAt) }}</span>
            </template>
            <template #item.updatedAt="{ item }">
                <span>{{ formatDate(item.updatedAt) }}</span>
            </template>
            <template #item.action="{ item }">
                <div class="d-flex ga-1">
                    <v-btn size="x-small" variant="text" color="primary" @click="view(item)">{{ t('pages.manage.posts.view') }}</v-btn>
                    <v-btn size="x-small" variant="text" color="primary" @click="showAddOrEdit(item)">{{ t('pages.manage.posts.edit') }}</v-btn>
                    <v-btn size="x-small" variant="text" color="error" @click="confirmRemove(item)">{{ t('pages.manage.session.remove') }}</v-btn>
                </div>
            </template>
        </v-data-table>

        <!-- Add/Edit Dialog -->
        <v-dialog v-model="modalVisible" max-width="800" scrollable>
            <v-card rounded="xl">
                <v-card-title class="text-h6 pa-6 pb-2">{{ t('pages.manage.posts.addOrEdit') }}</v-card-title>
                <v-progress-linear v-if="modalLoading" indeterminate color="primary" />
                <v-card-text class="pa-6 pt-2">
                    <v-form class="modalForm">
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.category"
                            :label="t('pages.manage.posts.category')"
                            :placeholder="t('pages.manage.posts.category')"
                        />
                        <v-text-field variant="outlined" rounded="lg" density="comfortable"
                            v-model="modalForm.title"
                            :label="t('pages.manage.posts.title')"
                            :placeholder="t('pages.manage.posts.title')"
                        />
                        <v-textarea variant="outlined" rounded="lg" density="comfortable"
                            :rows="8"
                            v-model="modalForm.content"
                            :label="t('pages.manage.posts.content')"
                            :placeholder="t('pages.manage.posts.content')"
                        />
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="modalVisible = false" rounded="xl" variant="text">{{ t('pages.manage.posts.close') }}</v-btn>
                    <v-btn color="primary" @click="addOrEdit()" :loading="modalLoading" rounded="xl" variant="flat">{{ t('pages.manage.config.save') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- Confirm Delete Dialog -->
        <v-dialog v-model="confirmDeleteVisible" max-width="400">
            <v-card rounded="xl" class="pa-4">
                <v-card-text class="text-body-1">{{ t('pages.manage.session.areYouSure') }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn @click="confirmDeleteVisible = false" rounded="xl" variant="text">{{ t('pages.manage.posts.close') }}</v-btn>
                    <v-btn color="primary" @click="doRemove()" rounded="xl" variant="flat">{{ t('pages.manage.session.remove') }}</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<style scoped>
.manage-posts-wrapper {
    margin-top: 8px;
}
.toolbar-row {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}
.md3-table {
    border-radius: 12px;
    overflow: hidden;
}
.md3-table :deep(thead) {
    background-color: rgb(var(--v-theme-surface-variant));
}
</style>
