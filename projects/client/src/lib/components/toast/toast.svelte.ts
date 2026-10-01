// The toasts on screen, newest first like OG's toastr. <Toaster /> in the root layout renders them.
// Call it from interactions only: this module is shared by every request on the server.
type ToastType = 'success' | 'error';

interface Toast {
  readonly id: number;
  readonly type: ToastType;
  readonly message: string;
}

let nextId = 0;
let list = $state<ReadonlyArray<Toast>>([]);

const show = (type: ToastType) => (message: string) => {
  list = [{ id: nextId++, type, message }, ...list];
};

export const toast = {
  get list() {
    return list;
  },
  success: show('success'),
  error: show('error'),
  dismiss: (id: number) => {
    list = list.filter((item) => item.id !== id);
  },
};
