package com.nurselingua.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "languages")
public class LanguageEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  @Column(nullable = false, unique = true, length = 12)
  private String code;

  @Column(nullable = false, length = 80)
  private String name;

  @Column(name = "native_name", nullable = false, length = 80)
  private String nativeName;

  @Column(name = "tts_locale", nullable = false, length = 12)
  private String ttsLocale;

  @Column(name = "stt_supported", nullable = false)
  private boolean sttSupported = true;

  @Column(nullable = false, length = 24)
  private String script = "Latin";

  @Column(name = "has_romanization", nullable = false)
  private boolean hasRomanization;

  @Column(name = "ui_locale_support", nullable = false)
  private boolean uiLocaleSupport;

  @Column(nullable = false)
  private boolean rtl;

  public Integer getId() { return id; }
  public String getCode() { return code; }
  public void setCode(String v) { this.code = v; }
  public String getName() { return name; }
  public void setName(String v) { this.name = v; }
  public String getNativeName() { return nativeName; }
  public void setNativeName(String v) { this.nativeName = v; }
  public String getTtsLocale() { return ttsLocale; }
  public void setTtsLocale(String v) { this.ttsLocale = v; }
  public boolean isSttSupported() { return sttSupported; }
  public void setSttSupported(boolean v) { this.sttSupported = v; }
  public String getScript() { return script; }
  public void setScript(String v) { this.script = v; }
  public boolean isHasRomanization() { return hasRomanization; }
  public void setHasRomanization(boolean v) { this.hasRomanization = v; }
  public boolean isUiLocaleSupport() { return uiLocaleSupport; }
  public void setUiLocaleSupport(boolean v) { this.uiLocaleSupport = v; }
  public boolean isRtl() { return rtl; }
  public void setRtl(boolean v) { this.rtl = v; }
}
