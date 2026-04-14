pub const NamespaceError = error{};

pub const Syntax = error{ UnterminatedComment, UnterminatedCdata, UnterminatedDoctype, UnterminatedProcessingInstruction };
