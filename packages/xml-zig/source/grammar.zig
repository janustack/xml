const std = @import("std");

pub const AttributeDefinition = struct {
    name: []const u8,
    attribute_type: AttributeType,
    default_declaration: DefaultDeclaration,
};

pub const AttributeListDeclaration = struct {
    name: []const u8,
    attribute_definitions: []const AttributeDefinition,
};

pub const AttributeType = union(enum) {
    enumerated_type: EnumeratedType,
    string_type: StringType,
    tokenized_type: TokenizedType,
};

pub const DefaultDeclaration = union(enum) {};

pub const EntityDeclaration = union(enum) {
    general: GeneralEntity,
    parameter: ParameterEntity,
};

// 4.2.2 External Entities
// [75]
// Spec:
pub const ExternalIdentifier = union(enum) {
    system: []const u8,
    public: struct {
        public_identifier_literal: []const u8,
        system_literal: []const u8,
    },
};

pub const ExternalSubset = struct {};

// 4.1 Character and Entity References
// [69]
pub const ParameterEntityReference = struct {
    name: []const u8,
};

// 4.1 Character and Entity References
// [67]
pub const Reference = union(enum) {
    character: []const u8,
    entity: []const u8,
};

pub const StringType = enum {
    cdata,
};

pub const TokenizedType = enum {
    id,
    idref,
    idrefs,
    entity,
    entities,
    nmtoken,
    nmtokens,
};
