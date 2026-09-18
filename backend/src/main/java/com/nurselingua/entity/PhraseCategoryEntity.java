package com.nurselingua.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "phrase_categories")
public class PhraseCategoryEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Integer id;

  @Column(nullable = false, unique = true, length = 32)
  private String slug;

  @Column(nullable = false, length = 80)
  private String name;

  @Column(length = 255)
  private String description;

  @Column(nullable = false)
  private int position;

  public Integer getId() { return id; }
  public String getSlug() { return slug; }
  public void setSlug(String v) { this.slug = v; }
  public String getName() { return name; }
  public void setName(String v) { this.name = v; }
  public String getDescription() { return description; }
  public void setDescription(String v) { this.description = v; }
  public int getPosition() { return position; }
  public void setPosition(int v) { this.position = v; }
}
