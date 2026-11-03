import {restoreWorkspaceBackup,validateWorkspaceBackup,WorkspaceRestoreError,type StoragePort,type WorkspaceBackupPayload} from './workspaceBackup';
import {importProjectPackage,type ProjectPackage} from './projectPackage';

export const WORKSPACE_RECOVERY_LOCK='layout-studio-workspace-recovery-required-v1';
export const WORKSPACE_RESCUE_PREFIX='layout-studio-before-replace-v1:';
type Approval={snapshot:string;confirmed:boolean;unsavedChanges:boolean;rescueId:string;allowRecovery?:boolean};

/** The rescue journal is separate from the five legacy slots and never overwrites an older copy. */
function protectedReplacement<T>(storage:StoragePort,approval:Approval,replace:(beforeWrite:(raw:string)=>void)=>T):T {
  if(!approval.confirmed||approval.unsavedChanges)throw new Error('Najpierw zachowaj niezapisane zmiany i potwierdź pobranie kopii ratunkowej.');
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(approval.rescueId))throw new Error('Nieprawidłowy identyfikator kopii ratunkowej.');
  const previousLock=storage.getItem(WORKSPACE_RECOVERY_LOCK);
  if(previousLock!==null&&!approval.allowRecovery)throw new Error('Najpierw dokończ odzyskiwanie środowiska.');
  const key=WORKSPACE_RESCUE_PREFIX+approval.rescueId;
  let rescue:string|undefined;
  const persistLock=(value:string)=>{
    storage.setItem(WORKSPACE_RECOVERY_LOCK,value);
    if(storage.getItem(WORKSPACE_RECOVERY_LOCK)!==value)throw new Error('Nie potwierdzono blokady odzyskiwania.');
  };
  const clearLock=()=>{
    if(storage.getItem(WORKSPACE_RECOVERY_LOCK)!==key)throw new Error('Blokada odzyskiwania zmieniła się.');
    storage.removeItem(WORKSPACE_RECOVERY_LOCK);
    if(storage.getItem(WORKSPACE_RECOVERY_LOCK)!==null)throw new Error('Nie potwierdzono usunięcia blokady odzyskiwania.');
  };
  try {
    const result=replace(raw=>{
      // restoreWorkspaceBackup checks expectedCurrentSnapshot before invoking this callback.
      if(storage.getItem(key)!==null)throw new Error('Kopia o tym identyfikatorze już istnieje. Nie została nadpisana.');
      storage.setItem(key,raw);
      if(storage.getItem(key)!==raw)throw new Error('Nie potwierdzono trwałego zapisu kopii ratunkowej.');
      rescue=raw;
      persistLock(key);
    });
    try {if(rescue!==undefined)clearLock();}
    catch(error){
      // Even a storage adapter that removes and then throws must retain the recovery marker.
      try {persistLock(key);}catch {/* The rescue remains available even if the storage itself has failed. */}
      throw new WorkspaceRestoreError(`Dane zastosowano, ale nie potwierdzono zakończenia odzyskiwania: ${(error as Error).message}`,rescue!,['Nie potwierdzono zakończenia; wymagane odzyskiwanie.']);
    }
    return result;
  } catch(error) {
    if(rescue!==undefined&&error instanceof WorkspaceRestoreError&&error.rollbackErrors.length===0){
      try {
        // A failed recovery must never unlock the earlier, still unresolved replacement.
        if(previousLock!==null)persistLock(previousLock);
        else if(storage.getItem(WORKSPACE_RECOVERY_LOCK)!==null)clearLock();
      }catch{throw new WorkspaceRestoreError(error.message,rescue,['Nie potwierdzono zakończenia wycofania; wróć do odzyskiwania.']);}
    }
    throw error;
  }
}

export function protectedImportProjectPackage(storage:StoragePort,pkg:ProjectPackage,approval:Approval){
  return protectedReplacement(storage,approval,beforeWrite=>importProjectPackage(storage,pkg,approval.snapshot,{beforeWrite}));
}
export function protectedRestoreWorkspaceBackup(storage:StoragePort,payload:WorkspaceBackupPayload,approval:Approval){
  return protectedReplacement(storage,approval,beforeWrite=>restoreWorkspaceBackup(storage,payload,{expectedCurrentSnapshot:approval.snapshot,beforeWrite}));
}
export function readWorkspaceRescues(storage:StoragePort&{length:number;key(index:number):string|null}){
  const copies:{key:string;raw:string;valid:boolean;name:string}[]=[];
  for(let i=0;i<storage.length;i++){
    const key=storage.key(i);if(!key?.startsWith(WORKSPACE_RESCUE_PREFIX))continue;
    const raw=storage.getItem(key);if(raw===null)continue;
    const checked=validateWorkspaceBackup(raw);
    copies.push({key,raw,valid:checked.valid,name:checked.payload?.summary.activeProjectV4Name??'Kopia do odzyskiwania'});
  }
  return copies;
}
