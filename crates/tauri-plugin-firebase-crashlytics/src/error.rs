use serde::{ser::SerializeMap, Serialize, Serializer};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
  /// The command has no implementation here (desktop: the TypeScript side uses its web stand-in instead)
  #[error("{0}")]
  Unimplemented(String),
  #[cfg(mobile)]
  #[error(transparent)]
  PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
}

/// The page gets `{ code, message }`: what `@capacitor-firebase` plugins reject with (`CapacitorException`). The Swift and Kotlin
/// plugins reject with a message and, for "not implemented" and "not available", the codes `UNIMPLEMENTED` and
/// `UNAVAILABLE`; they never send more than that.
impl Serialize for Error {
  fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
    let mut map = serializer.serialize_map(None)?;
    match self {
      Error::Unimplemented(message) => {
        map.serialize_entry("code", "UNIMPLEMENTED")?;
        map.serialize_entry("message", message)?;
      }
      #[cfg(mobile)]
      Error::PluginInvoke(tauri::plugin::mobile::PluginInvokeError::InvokeRejected(r)) => {
        if let Some(code) = &r.code {
          map.serialize_entry("code", code)?;
        }
        map.serialize_entry("message", r.message.as_deref().unwrap_or_default())?;
      }
      #[cfg(mobile)]
      Error::PluginInvoke(e) => {
        map.serialize_entry("message", &e.to_string())?;
      }
    }
    map.end()
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn unimplemented() {
    assert_eq!(
      serde_json::to_value(Error::Unimplemented("no".into())).unwrap(),
      json!({ "code": "UNIMPLEMENTED", "message": "no" })
    );
  }
}
