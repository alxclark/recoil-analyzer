export interface StateAnnotation {
  /* A number representing the sequencing where we will refactor */
  phase: number;
  /* An optional comment about the atom/selector */
  comment?: string;
  /* Whether the state needs to be refactored into a hook */
  hook?: boolean;
  /* Whether the state can be derived directly from the loader */
  loader?: boolean;
  /* Whether the state will be part of the form */
  form?: boolean;
  /* This means the state is not part of the form and is purely for the interface.  */
  interface?: boolean;
  /* This means the state needs to be removed/refactored out completely */
  refactor?: true;
}
