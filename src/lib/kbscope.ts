// Bộ giải "scope kho tri thức" (doc 30) — quyết định tài liệu/từ điển của một BUỔI lưu vào đâu:
//   • Buổi thuộc CHUỖI  → scope = `series:<seriesId>`  (kho chung của chuỗi, tích lũy liên tục)
//   • Sự kiện MỘT LẦN   → scope = <eventId>            (kho riêng của buổi)
// Dùng cho khóa proyaku_docs:<scope> (docs.ts) và proyaku_glossary:<scope> (sau gala). Nhờ đó tài liệu
// của các buổi cùng chuỗi cùng đổ về một cây → nhìn UI biết, và readiness (doc 29) đọc đúng kho.

import type { Conference } from './schedule';
import { getDocs } from './docs';
import type { SourceDoc } from './docs';

type ScopeInput = Pick<Conference, 'id' | 'seriesId'>;

/** Scope kho của một buổi. */
export function kbScopeId(conf: ScopeInput): string {
    return conf.seriesId ? `series:${conf.seriesId}` : conf.id;
}

/** Scope kho của một chuỗi (dùng ở màn chi tiết chuỗi / đếm kho). */
export const seriesScopeId = (seriesId: string): string => `series:${seriesId}`;

/** Tài liệu hiệu dụng của một buổi = kho theo scope. Buổi-thuộc-chuỗi thấy cả kho tích lũy của chuỗi. */
export const effectiveDocs = (conf: ScopeInput): SourceDoc[] => getDocs(kbScopeId(conf));

/** Số tài liệu trong kho của một scope (cho chip "Tài liệu N" ở thẻ chuỗi). */
export const scopeDocCount = (scope: string): number => getDocs(scope).length;
