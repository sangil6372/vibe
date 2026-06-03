"""
블로그 자동 생성 스크립트
실행: python generate_blog.py
- vibe 레포의 오늘 커밋 + 변경 내용을 읽어 Claude로 포스트 생성
- sangil6372.github.io/_posts/ 에 저장 후 자동 커밋+푸시
"""
import os, subprocess, sys
from datetime import datetime, date

VIBE_DIR = os.path.dirname(os.path.abspath(__file__))
BLOG_DIR = os.path.join(os.path.dirname(VIBE_DIR), 'sangil6372.github.io')
POSTS_DIR = os.path.join(BLOG_DIR, '_posts')

def run(cmd, cwd=None):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8').stdout.strip()

def today_str():
    return date.today().isoformat()

def post_exists():
    prefix = today_str()
    if not os.path.exists(POSTS_DIR):
        return False
    return any(f.startswith(prefix) for f in os.listdir(POSTS_DIR))

def get_git_log():
    log = run(['git', 'log', '--since=midnight', '--format=- %s (%h)', '--all'], cwd=VIBE_DIR)
    return log or '(커밋 없음)'

def get_diff_stat():
    stat = run(['git', 'diff', 'HEAD~3', 'HEAD', '--stat'], cwd=VIBE_DIR)
    return stat[:1500] if stat else '(변경 없음)'

def generate_post(commits, diff_stat):
    try:
        import anthropic
    except ImportError:
        print('[blog] anthropic 패키지 없음. pip install anthropic')
        sys.exit(1)

    client = anthropic.Anthropic()
    today = today_str()

    prompt = f"""오늘({today}) 개발한 내용을 바탕으로 한국어 개발 블로그 포스트를 작성해주세요.

## 오늘의 커밋
{commits}

## 변경된 파일
{diff_stat}

## 작성 규칙
- Jekyll front matter 포함 (layout: post, title, date, categories, tags)
- 한국어로 작성
- 분량: 800~1500자
- 구성: 오늘 한 일 요약 → 핵심 기술/문제 해설 → 배운 점 → 다음 작업
- 코드 블록은 실제 코드를 인용해서 설명
- 제목은 오늘 작업을 잘 나타내는 한국어로
- tags는 영어 소문자

반드시 완성된 마크다운 파일 내용만 출력하세요 (설명 없이)."""

    message = client.messages.create(
        model='claude-sonnet-4-6',
        max_tokens=3000,
        messages=[{'role': 'user', 'content': prompt}]
    )
    return message.content[0].text

def save_and_push(content):
    os.makedirs(POSTS_DIR, exist_ok=True)

    # 제목 추출해서 파일명 생성
    title_slug = 'devlog'
    for line in content.splitlines():
        if line.startswith('title:'):
            raw = line.replace('title:', '').strip().strip('"\'')
            import re
            slug = re.sub(r'[^\w가-힣\s-]', '', raw).strip().replace(' ', '-').lower()
            slug = re.sub(r'-+', '-', slug)[:60]
            title_slug = slug
            break

    filename = f'{today_str()}-{title_slug}.md'
    filepath = os.path.join(POSTS_DIR, filename)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'[blog] 포스트 저장: {filename}')

    # git commit + push
    run(['git', 'add', '.'], cwd=BLOG_DIR)
    run(['git', 'commit', '-m', f'docs: {today_str()} 개발 회고 자동 생성'], cwd=BLOG_DIR)
    result = run(['git', 'push', 'origin', 'main'], cwd=BLOG_DIR)
    print(f'[blog] GitHub Pages 업로드 완료')
    return filename

if __name__ == '__main__':
    if post_exists():
        print(f'[blog] 오늘({today_str()}) 포스트가 이미 존재합니다. 건너뜁니다.')
        sys.exit(0)

    print('[blog] 오늘 커밋 수집 중...')
    commits  = get_git_log()
    diff     = get_diff_stat()

    print('[blog] Claude로 포스트 생성 중...')
    content  = generate_post(commits, diff)

    filename = save_and_push(content)
    print(f'[blog] 완료! https://sangil6372.github.io')
