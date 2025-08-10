import { describe, it, expect } from 'bun:test';
import { GitUrlParser } from '../src/GitUrlParser.js';

describe('GitUrlParser', () => {
  describe('isGitUrl', () => {
    it('should detect GitHub URLs', () => {
      expect(GitUrlParser.isGitUrl('https://github.com/owner/repo')).toBe(true);
      expect(GitUrlParser.isGitUrl('https://github.com/owner/repo/tree/main')).toBe(true);
      expect(GitUrlParser.isGitUrl('https://github.com/owner/repo/tree/main/docs')).toBe(true);
      expect(GitUrlParser.isGitUrl('https://github.com/owner/repo/blob/main/README.md')).toBe(true);
    });

    it('should not detect non-git URLs', () => {
      expect(GitUrlParser.isGitUrl('https://example.com')).toBe(false);
      expect(GitUrlParser.isGitUrl('https://docs.example.com/api')).toBe(false);
      expect(GitUrlParser.isGitUrl('https://github.com')).toBe(false); // No owner/repo
      expect(GitUrlParser.isGitUrl('https://github.com/owner')).toBe(false); // No repo
    });

    it('should handle invalid URLs', () => {
      expect(GitUrlParser.isGitUrl('not-a-url')).toBe(false);
      expect(GitUrlParser.isGitUrl('')).toBe(false);
    });
  });

  describe('parseGitHubUrl', () => {
    it('should parse basic GitHub URL', () => {
      const result = GitUrlParser.parseGitHubUrl(new URL('https://github.com/owner/repo'));
      expect(result.host).toBe('github.com');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.branch).toBe('main');
      expect(result.subdirectory).toBe('');
    });

    it('should parse GitHub URL with tree/branch', () => {
      const result = GitUrlParser.parseGitHubUrl(new URL('https://github.com/owner/repo/tree/develop'));
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.branch).toBe('develop');
      expect(result.subdirectory).toBe('');
    });

    it('should parse GitHub URL with tree/branch/path', () => {
      const result = GitUrlParser.parseGitHubUrl(new URL('https://github.com/owner/repo/tree/main/docs/api'));
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.branch).toBe('main');
      expect(result.subdirectory).toBe('docs/api');
    });

    it('should parse GitHub URL with blob (file)', () => {
      const result = GitUrlParser.parseGitHubUrl(new URL('https://github.com/owner/repo/blob/main/README.md'));
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.branch).toBe('main');
      expect(result.subdirectory).toBe('README.md');
    });

    it('should parse GitHub URL with direct subdirectory', () => {
      const result = GitUrlParser.parseGitHubUrl(new URL('https://github.com/owner/repo/docs/api'));
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.branch).toBe('main');
      expect(result.subdirectory).toBe('docs/api');
    });

    it('should parse GitHub URL with ref query parameter', () => {
      const result = GitUrlParser.parseGitHubUrl(new URL('https://github.com/owner/repo?ref=develop'));
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
      expect(result.branch).toBe('develop');
      expect(result.subdirectory).toBe('');
    });
  });

  describe('parseGitUrl', () => {
    it('should parse valid GitHub URLs', () => {
      const result = GitUrlParser.parseGitUrl('https://github.com/owner/repo');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should throw error for non-git URLs', () => {
      expect(() => GitUrlParser.parseGitUrl('https://example.com')).toThrow('Not a valid Git repository URL');
    });

    it('should throw error for invalid URLs', () => {
      expect(() => GitUrlParser.parseGitUrl('not-a-url')).toThrow('Not a valid Git repository URL');
    });
  });

  describe('getGitHubApiUrl', () => {
    it('should construct API URL for root directory', () => {
      const repoInfo = {
        apiUrl: 'https://api.github.com',
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        subdirectory: ''
      };
      
      const apiUrl = GitUrlParser.getGitHubApiUrl(repoInfo);
      expect(apiUrl).toBe('https://api.github.com/repos/owner/repo/contents?ref=main');
    });

    it('should construct API URL for subdirectory', () => {
      const repoInfo = {
        apiUrl: 'https://api.github.com',
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        subdirectory: 'docs'
      };
      
      const apiUrl = GitUrlParser.getGitHubApiUrl(repoInfo);
      expect(apiUrl).toBe('https://api.github.com/repos/owner/repo/contents/docs?ref=main');
    });

    it('should construct API URL for subdirectory with additional path', () => {
      const repoInfo = {
        apiUrl: 'https://api.github.com',
        owner: 'owner',
        repo: 'repo',
        branch: 'develop',
        subdirectory: 'docs'
      };
      
      const apiUrl = GitUrlParser.getGitHubApiUrl(repoInfo, 'api');
      expect(apiUrl).toBe('https://api.github.com/repos/owner/repo/contents/docs/api?ref=develop');
    });
  });
});