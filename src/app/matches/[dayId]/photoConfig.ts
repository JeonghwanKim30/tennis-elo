// "use server" 파일(actions.ts)은 async 함수만 export할 수 있어, 클라이언트와
// 공유해야 하는 상수는 별도 파일로 뺀다.
export const MAX_PHOTOS_PER_DAY = 10;
