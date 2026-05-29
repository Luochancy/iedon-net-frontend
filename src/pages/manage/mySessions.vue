<script setup lang="ts">
import { onMounted, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { isAdmin, loggedIn, sessionMgmtSearchText, showSnackbar } from "../../common/helper";
import {
  makeRequest,
  RouterMetadata,
  RoutersResponse,
  SessionMetadata,
  SessionsResponse,
  SessionStatus,
} from "../../common/packetHandler";
import SessionTable from "../../components/SessionTable.vue";
import { showMyConnectivityInMap } from "../../common/helper";

const t = useI18n().t;
const router = useRouter();
const loading = ref(false);

interface Session extends SessionMetadata {
  routerJoined?: RouterMetadata;
}

const sessions: Ref<Session[]> = ref([]);
const routers: Ref<RouterMetadata[]> = ref([]);
const searchKeywords = sessionMgmtSearchText;

const fetchSessions = async () => {
  try {
    loading.value = true;

    let resp = await makeRequest(t, "/list/routers");
    if (resp.success && resp.response) {
      const data = resp.response as RoutersResponse;
      if (data && Array.isArray(data.routers)) {
        routers.value = data.routers.sort((a, b) =>
          ("" + a.name).localeCompare(b.name)
        );
        localStorage.setItem("routers", JSON.stringify(routers.value));
      }
    }

    resp = await makeRequest(t, "/session", {
      action: "enum",
    });
    if (resp.success && resp.response) {
      const data = resp.response as SessionsResponse;
      const newData: Session[] = [];
      if (data && Array.isArray(data.sessions)) {
        data.sessions.forEach((s) =>
          newData.push({
            ...s,
            routerJoined: routers.value.find((r) => r.uuid === s.router),
          })
        );
        sessions.value = newData;
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  if (!loggedIn.value) {
    showSnackbar(t("pages.nodes.pleaseSignIn"), "info");
    router.replace({ path: "/signin" });
    return;
  }
  await fetchSessions();
});

const simpleActionHandler = async (
  session: Session,
  action: "delete" | "enable" | "disable"
) => {
  try {
    loading.value = true;

    await makeRequest(t, "/session", {
      action,
      router: session.router,
      session: session.uuid,
    });
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
    fetchSessions();
  }
};

const handleEnable = (session: Session) =>
  simpleActionHandler(session, "enable");
const handleDisable = (session: Session) =>
  simpleActionHandler(session, "disable");
const handleRemove = (session: Session) =>
  simpleActionHandler(session, "delete");

const handleViewMetrics = (session: Session, event: MouseEvent) => {
  event.stopPropagation();
  if (
    session.status === SessionStatus.QUEUED_FOR_DELETE ||
    (session.status === SessionStatus.PENDING_APPROVAL && !isAdmin.value)
  ) {
    showSnackbar(t(`pages.manage.session.statusCode['${session.status}']`), "error");
    return;
  }
  router.push({
    path: `/manage/metrics/${session.router}/${session.uuid}`,
  });
};

const handleEdit = (session: Session) => {
  router.push({
    path: `/nodes/${session.router}/edit/${session.uuid}`,
  });
};

const redirectToNodes = () => {
  router.push({ path: "/nodes" });
};
</script>

<template>
  <div class="my-sessions-toolbar">
    <v-btn @click="redirectToNodes" prepend-icon="mdi-lan-connect" rounded="xl" variant="flat" color="primary">
      {{ t("pages.manage.session.newPeeringSession") }}
    </v-btn>
    <v-btn @click="showMyConnectivityInMap" prepend-icon="mdi-earth" rounded="xl" variant="tonal">
      {{ t("pages.manage.session.showMyConnectivityInMap") }}
    </v-btn>
    <v-btn @click="fetchSessions" :loading="loading" class="refresh-button" prepend-icon="mdi-refresh" rounded="xl" variant="tonal">
      {{ t("pages.metrics.refresh") }}
    </v-btn>
    <v-text-field
      v-model="searchKeywords"
      :placeholder="t('pages.manage.session.search')"
      class="searchBox"
      density="comfortable"
      variant="outlined"
      rounded="lg"
      hide-details
      append-inner-icon="mdi-magnify"
    />
  </div>
  <session-table
    :sessions="sessions"
    :loading="loading"
    :show-asn="false"
    :show-actions="true"
    :is-admin-mode="false"
    :search-keywords="searchKeywords"
    @view-metrics="handleViewMetrics"
    @enable="handleEnable"
    @disable="handleDisable"
    @remove="handleRemove"
    @edit="handleEdit"
  />
</template>

<style scoped>
.my-sessions-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.refresh-button {
  margin-right: auto;
}

.searchBox {
  max-width: 500px;
  min-width: 150px;
}

@media (max-width: 768px) {
  .my-sessions-toolbar {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px;
  }
  
  .my-sessions-toolbar > .v-btn {
    flex: 1 1 calc(50% - 4px);
    min-width: 120px;
  }
  
  .refresh-button {
    margin-right: 0;
  }
  
  .searchBox {
    flex: 1 1 100%;
    max-width: 100%;
    min-width: auto;
    margin-top: 4px;
  }
}

@media (max-width: 480px) {
  .my-sessions-toolbar {
    margin-bottom: 10px;
  }
}
</style>
